import type { Metadata } from "next";
import { LegalPage, Mail } from "@/components/Legal";

export const metadata: Metadata = { title: "Refunds | Jim Harvey's StoryMachine" };

export default function Refunds() {
  return (
    <LegalPage title="Refunds">
      <p>
        If the StoryMachine has not done what you needed, email <Mail /> within 14 days of paying and we will refund you
        in full. You do not need to give a reason, and you keep the stories and PDFs you have made.
      </p>
      <ul>
        <li><strong>One story:</strong> a full refund within 14 days of buying it.</li>
        <li><strong>A month:</strong> a full refund of the first payment within 14 days. After that, cancel any time from Billing in your account and you will not be charged again; you keep access to the end of the month you have paid for.</li>
        <li><strong>Lifetime:</strong> a full refund within 14 days of buying it. Your account then returns to the free plan.</li>
      </ul>
      <p>
        Refunds go back to the card you paid with, through Stripe. They usually reach your account within five to ten
        working days. Stories added by a programme code are free, so there is nothing to refund.
      </p>
      <p>This does not affect your legal rights as a consumer.</p>
    </LegalPage>
  );
}
