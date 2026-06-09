/**
 * `cn` — a tiny classNames joiner.
 *
 * Filters out falsy values so conditional classes stay readable:
 *   cn("base", isActive && "active", err ? "text-red-600" : null)
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
