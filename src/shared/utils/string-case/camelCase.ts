export function camelCase(s: string): string {
  return s
    .replace(/-./g, (match) => match.charAt(1).toUpperCase())
    .replace(/\s+(.)/g, (match, group1) => group1.toUpperCase())
    .replace(/^./, (match) => match.toLowerCase());
}
