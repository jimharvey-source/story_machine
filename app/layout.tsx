import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Jim Harvey's StoryMachine",
  description:
    "Turn rough notes into a presentation story that lands and sticks. Stage 1: Get your story straight. Stage 2: Add interest and impact.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
