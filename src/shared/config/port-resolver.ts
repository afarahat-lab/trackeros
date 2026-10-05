import { IPortResolver, ResolvedHttpPort } from './port-resolver.interface';

/**
 * The single fallback port in the codebase. Used when `PORT` is absent or
 * present but invalid.
 */
export const DEFAULT_PORT = 3000;

const MIN_PORT = 1;
const MAX_PORT = 65535;
const DIGITS_ONLY = /^[0-9]+$/;

/**
 * The canonical PORT validity predicate — the only definition of validity in
 * the codebase. A value is VALID iff, after trimming leading/trailing
 * whitespace, it is digits-only and its numeric value is within 1..65535.
 * Returns the numeric port when valid, `null` otherwise.
 */
function parseValidPort(rawPort: string | undefined): number | null {
  if (rawPort === undefined) return null;
  const trimmed = rawPort.trim();
  if (!DIGITS_ONLY.test(trimmed)) return null;
  const value = Number(trimmed);
  if (value < MIN_PORT || value > MAX_PORT) return null;
  return value;
}

/**
 * Pure, total resolution of the raw `PORT` value.
 *
 * Never reads `process.env`, never touches the filesystem, and never throws —
 * any invalid or absent input falls back to `DEFAULT_PORT` with source
 * `DEFAULT`. The fallback is deliberately silent: logging the offending value
 * would put an arbitrary environment string into the logs (GP-004).
 */
export class PortResolver implements IPortResolver {
  resolvePort(rawPort: string | undefined): ResolvedHttpPort {
    const port = parseValidPort(rawPort);
    if (port === null) {
      return { port: DEFAULT_PORT, source: 'DEFAULT', rawValue: rawPort };
    }
    return { port, source: 'ENV', rawValue: rawPort };
  }
}
