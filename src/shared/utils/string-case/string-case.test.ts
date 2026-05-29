import { kebabCase } from './kebabCase';
import { camelCase } from './camelCase';

describe('kebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(kebabCase('camelCase')).toBe('camel-case');
  });

  it('should convert spaces to dashes', () => {
    expect(kebabCase('hello world')).toBe('hello-world');
  });

  it('should handle mixed cases and spaces', () => {
    expect(kebabCase('Hello WorldTest')).toBe('hello-world-test');
  });
});

describe('camelCase', () => {
  it('should convert kebab-case to camelCase', () => {
    expect(camelCase('kebab-case')).toBe('kebabCase');
  });

  it('should convert spaces to camelCase', () => {
    expect(camelCase('hello world')).toBe('helloWorld');
  });

  it('should handle mixed cases and dashes', () => {
    expect(camelCase('Hello-World-Test')).toBe('helloWorldTest');
  });
});
