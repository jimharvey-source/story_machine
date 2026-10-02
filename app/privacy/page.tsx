import type { Metadata } from "next";
import { LegalPage, Mail } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy | Jim Harvey's StoryMachine" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy">
      <p>
        This notice explains what Jim Harvey&apos;s StoryMachine collects about you, why, who else handles it, and your
        rights. The controller is {LEGAL.company}, trading as {LEGAL.tradingAs}, company number {LEGAL.number},{" "}
        {LEGAL.office}. For anything about your data, email <Mail />.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your material.</strong> The notes you paste or the words from a file you upload, your answers about the audience and intent, and the stories the StoryMachine writes from them. Files are read in your browser: the file itself never reaches us, only its words.</li>
        <li><strong>Your email address,</strong> when you sign in, and your account details: your plan, stories left, and any programme code you used.</li>
        <li><strong>Payments.</strong> What you bought and when, and Stripe&apos;s reference for it. Your card details go to Stripe, never to us.</li>
        <li><strong>Limits and security.</strong> A random code in a cookie (<code>sm_guest</code>) for people who have not signed in, and a scrambled (hashed) form of your internet address, so we can limit free use and wrong programme codes. We cannot turn the hashed form back into your address.</li>
        <li><strong>Sign-in.</strong> Cookies that keep you signed in. Your browser also keeps a draft of the form, so you do not lose your notes while you sign in. That draft stays on your device.</li>
      </ul>
      <p>We use no advertising or tracking cookies.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the StoryMachine for you: build, save and show your stories, and keep your account. This is needed to provide the service you asked for.</li>
        <li>To take payment and keep the records the law requires.</li>
        <li>To keep the service working and fair: daily limits, stopping code guessing, fixing faults. This is in our legitimate interest and yours.</li>
        <li>
          To send you the Presentation Guru email. When you first sign in, your address joins the Presentation Guru
          list: about one email a month from Jim Harvey on presenting. The sign-in box tells you this. Every email has an
          unsubscribe link, and you can also ask us to remove you. If you buy, your list entry is tagged with what you
          bought.
        </li>
      </ul>
      <p>We do not sell your information, and we do not use your material to train AI models.</p>

      <h2>Who else handles it</h2>
      <p>These companies process your information for us, under contracts that limit them to doing so:</p>
      <ul>
        <li><strong>Anthropic</strong> (United States) runs the AI model that reads your material and writes your story. Under its commercial terms it does not use what we send it to train its models.</li>
        <li><strong>Supabase</strong> (servers in Ireland) holds your account and your stories.</li>
        <li><strong>Vercel</strong> (United States and worldwide) hosts the site.</li>
        <li><strong>Stripe</strong> (United States and Ireland) takes payments.</li>
        <li><strong>Resend</strong> (United States) sends the sign-in emails.</li>
        <li><strong>Mailchimp</strong>, part of Intuit (United States), sends the Presentation Guru email.</li>
      </ul>
      <p>
        Where your information goes outside the United Kingdom, it is protected by the safeguards UK law requires, such
        as the UK extension to the EU and US Data Privacy Framework or approved contract terms.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and stories while your account is open, so you can come back to them. Ask us to delete
        your account and we will delete it and your stories within 30 days. Payment records are kept for six years,
        because the law requires it. The hashed internet addresses used for limits are kept for no more than a year.
        Stories made without signing in are kept under the random browser code; if you sign in on that browser, they
        move to your account.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your information, ask us to correct it or delete it, object to how we use it, or ask
        us to send it to you in a form you can reuse. Email <Mail />. We answer within a month. If you are unhappy with
        how we handle your information, you can complain to the Information Commissioner&apos;s Office at{" "}
        <a href="https://ico.org.uk">ico.org.uk</a>.
      </p>

      <h2>Changes</h2>
      <p>If we change this notice, the date at the top changes. If a change matters, we will tell signed-in users by email.</p>
    </LegalPage>
  );
}
