// Adds an address to the Presentation Guru list through the Mailchimp Marketing API.
// Needs MAILCHIMP_API_KEY (the server prefix is read from the key), MAILCHIMP_LIST_ID.
// Without them it does nothing and says so once in the log.

import { createHash } from "crypto";

let warned = false;

export async function subscribeToPresentationGuru(email: string): Promise<boolean> {
  const key = process.env.MAILCHIMP_API_KEY ?? "";
  const list = process.env.MAILCHIMP_LIST_ID ?? "";
  if (!key || !list) {
    if (!warned) {
      warned = true;
      console.log("[mailchimp] MAILCHIMP_API_KEY or MAILCHIMP_LIST_ID not set; sign-ups are not being added to the list");
    }
    return false;
  }
  const dc = key.split("-").pop();
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${list}/members/${hash}`, {
    method: "PUT",
    headers: {
      Authorization: "Basic " + Buffer.from(`anystring:${key}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      tags: ["story-machine"],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[mailchimp]", res.status, text.slice(0, 200));
    return false;
  }
  return true;
}
