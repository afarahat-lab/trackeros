export function snakeCase(s: string): string {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}
