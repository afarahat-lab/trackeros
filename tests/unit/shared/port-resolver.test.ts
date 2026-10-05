import { DEFAULT_PORT, PortResolver } from '../../../src/shared/config';
import type { PortSource, ResolvedHttpPort } from '../../../src/shared/config';

const ENV: PortSource = 'ENV';
const DEFAULT: PortSource = 'DEFAULT';

const resolver = new PortResolver();

/**
 * The canonical strict predicate: trim, then digits-only, then 1..65535.
 * Every one of these is INVALID and must fall back to DEFAULT_PORT.
 */
const INVALID_INPUTS: ReadonlyArray<string> = [
  'not-a-number',
  '3000abc',
  '3e3',
  '0xBB8',
  '+3000',
  '3000.5',
  '0',
  '-1',
  '',
  '70000',
];

describe('PortResolver.resolvePort', () => {
  describe('when PORT is unset', () => {
    it('falls back to DEFAULT_PORT with source DEFAULT', () => {
      expect(resolver.resolvePort(undefined)).toEqual({
        port: DEFAULT_PORT,
        source: DEFAULT,
        rawValue: undefined,
      });
    });
  });

  describe('when PORT is a valid value', () => {
    it('resolves the numeric value with source ENV', () => {
      expect(resolver.resolvePort('4000')).toEqual({
        port: 4000,
        source: ENV,
        rawValue: '4000',
      });
    });

    it('trims surrounding whitespace before validating', () => {
      expect(resolver.resolvePort(' 4000 ')).toEqual({
        port: 4000,
        source: ENV,
        rawValue: ' 4000 ',
      });
    });

    it('accepts the inclusive range boundaries 1 and 65535', () => {
      expect(resolver.resolvePort('1')).toEqual({
        port: 1,
        source: ENV,
        rawValue: '1',
      });
      expect(resolver.resolvePort('65535')).toEqual({
        port: 65535,
        source: ENV,
        rawValue: '65535',
      });
    });
  });

  describe('when PORT is present but invalid', () => {
    it.each(INVALID_INPUTS)(
      'falls back to DEFAULT_PORT for %p',
      (rawValue) => {
        expect(resolver.resolvePort(rawValue)).toEqual({
          port: DEFAULT_PORT,
          source: DEFAULT,
          rawValue,
        });
      },
    );

    it('never throws for absent or arbitrary invalid input', () => {
      const inputs: ReadonlyArray<string | undefined> = [
        undefined,
        ...INVALID_INPUTS,
      ];
      for (const rawValue of inputs) {
        expect(() => resolver.resolvePort(rawValue)).not.toThrow();
      }
    });

    it('retains the raw value for diagnostics without using it as the port', () => {
      const result: ResolvedHttpPort = resolver.resolvePort('70000');
      expect(result.rawValue).toBe('70000');
      expect(result.port).toBe(DEFAULT_PORT);
      expect(result.source).toBe(DEFAULT);
    });
  });
});
