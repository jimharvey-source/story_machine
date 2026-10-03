import Link from "next/link";

/**
 * The StoryMachine lockup: the red opening quote, "Jim Harvey's" and the wordmark, drawn as outlines so no
 * font is needed. Files in /public. The mark is the quote that opens every spoken passage.
 */
export function Lockup({ href = "/", className = "h-9" }: { href?: string | null; className?: string }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/storymachine-lockup.svg" alt="Jim Harvey's StoryMachine" width={297} height={60} className={`${className} w-auto`} />
  );
  return href ? (
    <Link href={href} className="inline-block" aria-label="Jim Harvey's StoryMachine, home">
      {img}
    </Link>
  ) : (
    img
  );
}
