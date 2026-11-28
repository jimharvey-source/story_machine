import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Mail } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms | Jim Harvey's StoryMachine" };

export default function Terms() {
  return (
    <LegalPage title="Terms">
      {/* Draft 9 (John, 19 November), keeping three lines Jim chose to keep: the legal carve-out, the consumer-rights
          line and lifetime access. */}
      <p>
        These terms cover your use of Jim Harvey&apos;s StoryMachine at storymachine.themessagebusiness.com.
        StoryMachine is provided by {LEGAL.company}, trading as {LEGAL.tradingAs}, a company registered in England and
        Wales with number {LEGAL.number}, whose registered office is at {LEGAL.office}. &ldquo;We&rdquo; means us.
        &ldquo;You&rdquo; means the person using it. By using StoryMachine you agree to these terms.
      </p>

      <h2>What StoryMachine does</h2>
      <p>
        You give it your notes, a deck or a document. It builds a presentation story from them in two stages. Stage 1,
        Get your story straight, is free and needs no account. Stage 2, Add interest and impact, and the PDF require you
        to sign in with your email address.
      </p>
      <p>
        StoryMachine uses the AI model Claude by Anthropic to write. It is instructed to keep to your facts and to invent
        nothing. Its output is checked by code, but it can still get things wrong. You are responsible for whatever you
        present. Please check every fact, figure and name against your own material before you use it. Nothing that
        StoryMachine writes is legal, financial, professional or other advice.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with a code or link sent to your email. Keep access to that email account to yourself. One account
        is for one person. You must be 18 or over to create one.
      </p>

      <h2>Prices and payment</h2>
      <p>
        Your first story is free: both stages and the downloads, with one rerun and five AI edits. After that you can
        buy one story, one month or one year, at the prices shown on the site when you buy. Prices are in US dollars and include VAT where it applies, so the price shown is the price you pay. We are registered for VAT in the UK (VAT number {LEGAL.vat}). Payments are taken by Stripe; we never see or
        store your card details.
      </p>
      <ul>
        <li>One story gives you that story, both stages and the downloads, for as long as your account is open.</li>
        <li>One month gives you as many stories as you want during that month. It renews each month. Cancel any time from Billing in your account; you will have full access to the end of the month for which you have paid.</li>
        <li>One year gives you as many stories as you want for twelve months. It renews each year. Cancel any time from Billing in your account; you will have full access to the end of the year for which you have paid.</li>
        <li>Lifetime access, sold until 11 October 2026, continues for those who bought it, for as long as we run StoryMachine.</li>
        <li>A programme code from a {LEGAL.tradingAs} training programme adds a stated number of stories, for free, until a specific date.</li>
      </ul>
      <p>
        Refunds are set out on the <Link href="/refunds">refunds page</Link>.
      </p>

      <h2>Your material and your stories</h2>
      <p>
        All information that you upload remains your exclusive property, as does the story that StoryMachine writes from
        it. You give us permission to store and process your material only to run StoryMachine for you. We will not
        publish it, sell it or use it to train AI models. Files that you upload are read in your browser; only their words are sent to us. The only exceptions are photos and screenshots; they go to our servers, are read for the text, and then deleted. How we handle your information is set out in the <Link href="/privacy">privacy notice</Link>.
      </p>
      <p>
        Only upload material or information that you have the right to use. If it belongs to your employer or a client,
        make sure you are allowed to use it this way. We accept no responsibility for any information that you upload
        unlawfully or in breach of contractual agreement.
      </p>

      <h2>The method</h2>
      <p>
        The method behind StoryMachine (the three-act structure, the prologue and epilogue, the presentation types and
        the tests each part has to pass) is the intellectual property of {LEGAL.tradingAs}. You may use it, and what
        StoryMachine gives you, for your own presentations. You may not copy StoryMachine, its prompts or its method to
        build a competing product, and you may not teach this method commercially without our written agreement.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not use StoryMachine for anything unlawful, including to harass or defame anyone. Do not try to break,
        overload or get round StoryMachine&apos;s limits. We set daily limits on free use and may change them. We may
        suspend an account that breaks these terms; if you have paid, we reserve the right to decide whether to provide
        a refund and, if so, the amount.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We aim to keep StoryMachine running and will look for improvements that we can make from time to time. However,
        we cannot guarantee that StoryMachine will always be available or free of faults. We may change how it works. If
        we ever close it, we will give users at least 30 days&apos; notice so they can download their stories.
      </p>

      <h2>Our liability</h2>
      <p>
        Nothing in these terms limits our liability for anything the law does not allow us to limit. Otherwise, we accept no liability for any direct or indirect
        losses arising from any content that you produce using StoryMachine. You are responsible for everything that you
        produce using StoryMachine. Our total liability to you is limited to the amount you paid us in the twelve months
        before the claim. As a consumer, you have legal rights these terms do not affect.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top shows the latest version. If a change will affect users, we will
        tell signed-in users by email before making the change.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the law of England and Wales, and its courts will deal with any dispute.</p>

      <h2>Contact</h2>
      <p>
        <Mail />, or write to {LEGAL.company}, {LEGAL.office}.
      </p>
    </LegalPage>
  );
}
