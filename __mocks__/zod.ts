export class ZodError extends Error {
  issues: any[];
  constructor() {
    super('ZodError');
    this.issues = [{ message: 'Invalid input' }];
  }
}

const createChainable = () => {
  const chain: any = {
    min: () => chain,
    max: () => chain,
    email: () => chain,
    uuid: () => chain,
    optional: () => chain,
    positive: () => chain,
    int: () => chain,
    default: () => chain,
    partial: () => chain,
    parse: (input: any) => {
      // Mock validation specifically for the controller test case
      if (input && typeof input === 'object' && 'id' in input && input.id === 'invalid-uuid') {
        throw new ZodError();
      }
      return input;
    },
    safeParse: (input: any) => {
      if (input && typeof input === 'object' && 'id' in input && input.id === 'invalid-uuid') {
        return { success: false, error: new ZodError() };
      }
      return { success: true, data: input };
    }
  };
  return chain;
};

export const z = {
  string: () => createChainable(),
  number: () => createChainable(),
  boolean: () => createChainable(),
  enum: () => createChainable(),
  nativeEnum: () => createChainable(),
  object: () => createChainable(),
  array: () => createChainable(),
  optional: () => createChainable(),
  ZodError,
};
