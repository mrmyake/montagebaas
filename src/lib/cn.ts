/** Kleine className-helper (geen extra dependency nodig). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
