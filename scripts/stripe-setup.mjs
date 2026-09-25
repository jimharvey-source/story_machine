// Sets up Stripe for the Story Machine: product, three prices, launch coupon and code,
// webhook endpoint, and a customer portal configuration. Safe to run again: it finds
// what already exists before creating anything.
//
// Reads STRIPE_SECRET_KEY from .env.local (never from the chat) and writes the resulting
// ids back into .env.local. Prints ids only; the webhook signing secret goes to the file.
//
//   node scripts/stripe-setup.mjs            (uses the key in .env.local; prices in USD)
//   CURRENCY=gbp node scripts/stripe-setup.mjs
//
// Running it again with a different currency makes new prices and moves the lookup keys to them;
// the old prices stay in Stripe, inactive, so past payments still reconcile.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
function envGet(name) {
  const m = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}
const KEY = process.env.STRIPE_SECRET_KEY || envGet("STRIPE_SECRET_KEY");
if (!KEY) {
  console.error("Put STRIPE_SECRET_KEY=sk_... in .env.local first.");
  process.exit(1);
}
const MODE = KEY.startsWith("sk_live") ? "live" : "test";
const CURRENCY = (process.env.CURRENCY || "usd").toLowerCase();
const SYMBOL = CURRENCY === "gbp" ? "£" : CURRENCY === "eur" ? "€" : "$";
const SITE = (process.env.SITE_URL || envGet("NEXT_PUBLIC_SITE_URL") || "https://storymachine.themessagebusiness.com").replace(/\/$/, "");

// Stripe takes form-encoded bodies, nested as a[b][c]=v.
function encode(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encode(item, `${key}[${i}]`, out) : out.push(`${key}[${i}]=${encodeURIComponent(item)}`)));
    else if (typeof v === "object") encode(v, key, out);
    else out.push(`${key}=${encodeURIComponent(String(v))}`);
  }
  return out.join("&");
}

async function stripe(method, resource, params) {
  const url = new URL(`https://api.stripe.com/v1/${resource}`);
  const init = { method, headers: { Authorization: `Basic ${Buffer.from(KEY + ":").toString("base64")}` } };
  if (params && method === "GET") url.search = encode(params);
  if (params && method !== "GET") {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = encode(params);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${resource}: ${res.status} ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`${method} ${resource}: ${data.error?.message ?? res.status}`);
  return data;
}

const PRODUCT_NAME = "Story Machine";
const PRICES = [
  { key: "story_machine_story", env: "STRIPE_PRICE_STORY", nickname: "One story", unit_amount: 299 },
  { key: "story_machine_monthly", env: "STRIPE_PRICE_MONTHLY", nickname: "A month", unit_amount: 1599, recurring: { interval: "month" } },
  { key: "story_machine_lifetime", env: "STRIPE_PRICE_LIFETIME", nickname: "Lifetime", unit_amount: 9900 },
];
const COUPON_ID = CURRENCY === "usd" ? "story-machine-launch-49" : `story-machine-launch-49-${CURRENCY}`;
const PROMO_CODE = "LAUNCH49";
const WEBHOOK_URL = `${SITE}/api/stripe/webhook`;
const WEBHOOK_EVENTS = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];

const out = {};
console.log(`Stripe ${MODE} mode, ${CURRENCY.toUpperCase()}, site ${SITE}`);

// 1. Product
let product = (await stripe("GET", "products", { active: true, limit: 100 })).data.find((p) => p.metadata?.app === "story-machine");
if (!product) {
  product = await stripe("POST", "products", {
    name: PRODUCT_NAME,
    description: "Jim's Three Act Story Machine: turn rough notes into a presentation story that lands and sticks.",
    metadata: { app: "story-machine" },
    statement_descriptor: "STORY MACHINE",
  });
  console.log("created product", product.id);
} else console.log("product exists", product.id);

// 2. Prices, found by lookup key. A price in another currency is retired and replaced.
for (const p of PRICES) {
  let price = (await stripe("GET", "prices", { lookup_keys: [p.key], limit: 1 })).data[0];
  if (price && price.currency !== CURRENCY) {
    console.log(`price ${p.nickname} exists in ${price.currency.toUpperCase()}; making a ${CURRENCY.toUpperCase()} one`);
    await stripe("POST", `prices/${price.id}`, { active: false });
    price = undefined;
  }
  if (!price) {
    price = await stripe("POST", "prices", {
      product: product.id,
      currency: CURRENCY,
      unit_amount: p.unit_amount,
      nickname: `${p.nickname} ${SYMBOL}${(p.unit_amount / 100).toFixed(2)}`,
      lookup_key: p.key,
      transfer_lookup_key: true,
      recurring: p.recurring,
      metadata: { app: "story-machine" },
    });
    console.log(`created price ${p.nickname}`, price.id);
  } else console.log(`price ${p.nickname} exists`, price.id);
  out[p.env] = price.id;
}

// 3. Launch offer: $50 off lifetime, first 500, code LAUNCH49
let coupon;
try {
  coupon = await stripe("GET", `coupons/${COUPON_ID}`);
  console.log("coupon exists", coupon.id);
} catch {
  coupon = await stripe("POST", "coupons", {
    id: COUPON_ID,
    name: `Launch offer: lifetime for ${SYMBOL}49`,
    amount_off: 5000,
    currency: CURRENCY,
    duration: "once",
    max_redemptions: 500,
    applies_to: { products: [product.id] },
  });
  console.log("created coupon", coupon.id);
}
let promo = (await stripe("GET", "promotion_codes", { code: PROMO_CODE, limit: 1 })).data[0];
if (promo && (promo.coupon?.id ?? promo.promotion?.coupon) !== coupon.id) {
  // The code points at a coupon in the old currency. Retire it so the code can be reissued.
  await stripe("POST", `promotion_codes/${promo.id}`, { active: false });
  console.log("retired promotion code on the old coupon");
  promo = undefined;
}
if (!promo) {
  // Newer API versions take promotion[coupon]; older ones take coupon. Try the new shape first.
  try {
    promo = await stripe("POST", "promotion_codes", { promotion: { type: "coupon", coupon: coupon.id }, code: PROMO_CODE, max_redemptions: 500 });
  } catch (e) {
    if (!/unknown parameter: promotion/i.test(String(e))) throw e;
    promo = await stripe("POST", "promotion_codes", { coupon: coupon.id, code: PROMO_CODE, max_redemptions: 500 });
  }
  console.log("created promotion code", promo.code);
} else console.log("promotion code exists", promo.code);

// 4. Webhook endpoint. The signing secret is only returned on creation.
let hook = (await stripe("GET", "webhook_endpoints", { limit: 100 })).data.find((w) => w.url === WEBHOOK_URL);
if (!hook) {
  hook = await stripe("POST", "webhook_endpoints", { url: WEBHOOK_URL, enabled_events: WEBHOOK_EVENTS, description: "Story Machine" });
  out.STRIPE_WEBHOOK_SECRET = hook.secret;
  console.log("created webhook", hook.id, "(signing secret written to .env.local)");
} else {
  console.log("webhook exists", hook.id, "(signing secret unchanged; it is in the Stripe dashboard under that endpoint)");
}

// 5. Customer portal: cancel, change card, invoices. The first configuration becomes the default.
const configs = await stripe("GET", "billing_portal/configurations", { limit: 10 });
if (!configs.data.some((c) => c.is_default)) {
  await stripe("POST", "billing_portal/configurations", {
    business_profile: { headline: "Story Machine billing", privacy_policy_url: `${SITE}/privacy`, terms_of_service_url: `${SITE}/terms` },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
    default_return_url: `${SITE}/`,
  });
  console.log("created customer portal configuration");
} else console.log("customer portal configuration exists");

// 6. Write ids into .env.local, replacing any earlier value for the same name.
let next = env;
for (const [k, v] of Object.entries(out)) {
  const line = `${k}=${v}`;
  next = new RegExp(`^${k}=.*$`, "m").test(next) ? next.replace(new RegExp(`^${k}=.*$`, "m"), line) : next.replace(/\n?$/, "\n") + line + "\n";
}
fs.writeFileSync(envPath, next);
console.log("\nWritten to .env.local:", Object.keys(out).join(", "));
console.log("\nCopy these into Vercel (all environments):");
for (const p of PRICES) console.log(`  ${p.env}=${out[p.env]}`);
console.log(`  STRIPE_WEBHOOK_SECRET=  (in .env.local${out.STRIPE_WEBHOOK_SECRET ? "" : ", or the Stripe dashboard"})`);
console.log(`  STRIPE_SECRET_KEY=      (the ${MODE} key you used)`);
