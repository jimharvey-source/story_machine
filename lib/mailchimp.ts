// Adds an address to the Presentation Guru list through the Mailchimp Marketing API.
// Needs MAILCHIMP_API_KEY (the server prefix is read from the key), MAILCHIMP_LIST_ID.
// Without them it does nothing and says so once in the log.

import { createHash } from "crypto";

let warned = false;

function config(): { key: string; list: string; dc: string } | null {
  const key = (process.env.MAILCHIMP_API_KEY ?? "").trim();
  const list = (process.env.MAILCHIMP_LIST_ID ?? "").trim();
  if (!key || !list) {
    if (!warned) {
      warned = true;
      console.log("[mailchimp] MAILCHIMP_API_KEY or MAILCHIMP_LIST_ID not set; sign-ups are not being added to the list");
    }
    return null;
  }
  return { key, list, dc: key.split("-").pop() ?? "us1" };
}

function memberUrl(c: { list: string; dc: string }, email: string): string {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://${c.dc}.api.mailchimp.com/3.0/lists/${c.list}/members/${hash}`;
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: "Basic " + Buffer.from(`anystring:${key}`).toString("base64"),
    "Content-Type": "application/json",
  };
}

/** First sign-in: add the address to the list, tagged story-machine. The sign-in form says this happens. */
export async function subscribeToPresentationGuru(email: string): Promise<boolean> {
  const c = config();
  if (!c) return false;
  const res = await fetch(memberUrl(c, email), {
    method: "PUT",
    headers: headers(c.key),
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      tags: ["story-machine"],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[mailchimp] subscribe", res.status, text.slice(0, 200));
    return false;
  }
  console.log(JSON.stringify({ tag: "mailchimp", action: "subscribed" }));
  return true;
}

/**
 * Mark what someone has bought, so the list can be segmented: story-machine-paid, plus one of
 * story-machine-story, story-machine-monthly, story-machine-lifetime. Never blocks the purchase.
 */
export async function tagPurchase(email: string, kind: "story" | "monthly" | "lifetime"): Promise<boolean> {
  const c = config();
  if (!c) return false;
  const res = await fetch(memberUrl(c, email) + "/tags", {
    method: "POST",
    headers: headers(c.key),
    body: JSON.stringify({
      tags: [
        { name: "story-machine-paid", status: "active" },
        { name: `story-machine-${kind}`, status: "active" },
      ],
    }),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    console.warn("[mailchimp] tag", res.status, text.slice(0, 200));
    return false;
  }
  console.log(JSON.stringify({ tag: "mailchimp", action: "tagged", kind }));
  return true;
}
