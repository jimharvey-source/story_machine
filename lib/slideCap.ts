// The ceiling on supporting slides (Jim, 19 November 2026: "a rough ceiling"). Beyond the title, the three
// act slides and the close. Set by the length of the talk when the presenter gave one.
export function supportingCap(minutes: number | null | undefined): number {
  if (!minutes || minutes < 1) return 5;
  if (minutes <= 5) return 1;
  if (minutes <= 12) return 3;
  if (minutes <= 30) return 6;
  return 9;
}
