import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jim's Three Act Story Machine",
  description:
    "Turn rough notes into a clear, memorable presentation story. Prologue, Why, How, What, Epilogue.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
