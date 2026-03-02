export function normalizeRecipeName(name: string) {
  return name.trim().replace(/[ \t\r\n]+/g, " ");
}
