const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function isSafeHttpUrl(value: string): boolean {
  const candidate = value.trim();
  if (
    !candidate ||
    CONTROL_CHARACTER.test(candidate) ||
    candidate.includes("\\")
  ) {
    return false;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeRelativeUrl(value: string): boolean {
  const candidate = value.trim();
  if (!candidate || CONTROL_CHARACTER.test(candidate)) return false;
  if (candidate.startsWith("//") || candidate.startsWith("\\")) return false;
  if (candidate.includes("\\") || URL_SCHEME.test(candidate)) return false;
  return true;
}
