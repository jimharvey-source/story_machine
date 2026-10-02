import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Mail } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms | Jim Harvey's StoryMachine" };

export default function Terms() {
  return (
    <LegalPage title="Terms">
      <p>
        These terms cover your use of Jim Harvey&apos;s StoryMachine at storymachine.themessagebusiness.com. The
        StoryMachine is provided by {LEGAL.company}, trading as {LEGAL.tradingAs}, a company registered in England and
        Wales with number {LEGAL.number}, whose registered office is at {LEGAL.office}. &ldquo;We&rdquo; means us.
        &ldquo;You&rdquo; means the person using it. By using the StoryMachine you agree to these terms.
      </p>

      <h2>What the StoryMachine does</h2>
      <p>
        You give it your notes, a deck or a document. It builds a presentation story from them in two stages. Stage 1,
        Get your story straight, is free and needs no account. Stage 2, Add interest and impact, and the PDF need you to
        sign in with your email address.
      </p>
      <p>
        The StoryMachine uses an AI model to write. It is told to keep to your facts and to invent nothing, and its
        output is checked by code, but it can still get things wrong. You are responsible for what you present. Check
        every fact, figure and name against your own material before you use it. Nothing the StoryMachine writes is
        legal, financial or professional advice.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with a code or link sent to your email. Keep access to that email account to yourself. One account
        is for one person. You must be 18 or over to create one.
      </p>

      <h2>Prices and payment</h2>
      <p>
        Your first story after you sign in includes Stage 2 and the PDF free. After that you can buy one story, a
        month, or lifetime access, at the prices shown on the site when you buy. Prices are in US dollars. We are not
        registered for VAT, so the price shown is the price you pay. Payments are taken by Stripe; we never see or
        store your card details.
      </p>
      <ul>
        <li>One story unlocks Stage 2 and the PDF for that story, for as long as your account is open.</li>
        <li>A month gives you as many stories as you need until you cancel. It renews each month. Cancel any time from Billing in your account; you keep access to the end of the month you have paid for.</li>
        <li>Lifetime gives you as many stories as you need for as long as we run the StoryMachine.</li>
        <li>A programme code from a {LEGAL.tradingAs} training programme adds the number of stories it states, free, until the date it states.</li>
      </ul>
      <p>
        Refunds are set out on the <Link href="/refunds">refunds page</Link>.
      </p>

      <h2>Your material and your stories</h2>
      <p>
        What you put in stays yours, and so does the story the StoryMachine writes from it. You give us permission to
        store and process your material only to run the StoryMachine for you. We do not publish it, sell it or use it to
        train AI models. Files you upload are read in your browser; only their words are sent to us. How we handle your
        information is set out in the <Link href="/privacy">privacy notice</Link>.
      </p>
      <p>
        Only put in material you have the right to use. If it belongs to your employer or a client, make sure you are
        allowed to use it this way.
      </p>

      <h2>The method</h2>
      <p>
        The method behind the StoryMachine (the three-act structure, the Prologue and Epilogue, the presentation types
        and the tests each part has to pass) is the intellectual property of {LEGAL.tradingAs}. You may use it, and
        what the StoryMachine gives you, for your own presentations. You may not copy the StoryMachine, its prompts or
        its method to build a competing product, or teach the method commercially without our agreement.
      </p>

      <h2>Fair use</h2>
      <p>
        Do not use the StoryMachine for anything unlawful, to harass or defame anyone, or to try to break, overload or
        get round its limits. We set daily limits on free use and may change them. We may suspend an account that
        breaks these terms; if you have paid, we will refund what is fair.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We aim to keep the StoryMachine running and improving, but we cannot promise it will always be available or
        free of faults. We may change how it works. If we ever close it, we will give lifetime and monthly users at
        least 30 days&apos; notice so they can download their stories.
      </p>

      <h2>Our liability</h2>
      <p>
        Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for
        anything else the law does not allow us to limit. Otherwise, we are not liable for indirect losses, or for
        losses arising from content you present without checking it. Our total liability to you is limited to the
        amount you paid us in the twelve months before the claim. If you buy as a consumer, you have legal rights these
        terms do not affect.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top shows the latest version. If a change matters to people who have
        paid, we will tell them by email first.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the law of England and Wales, and its courts deal with any dispute.</p>

      <h2>Contact</h2>
      <p>
        <Mail />, or write to {LEGAL.company}, {LEGAL.office}.
      </p>
    </LegalPage>
  );
}
