declare module 'dotenv';

declare module 'fastify' {
  export interface FastifyRequest {
    params: any;
    body: any;
    query: any;
    headers: any;
    user?: any;
  }
  export interface FastifyReply {
    status(code: number): FastifyReply;
    send(payload?: any): FastifyReply;
    code(code: number): FastifyReply;
  }
  export interface FastifyInstance {
    get(path: string, opts: any, handler: Function): void;
    get(path: string, handler: Function): void;
    post(path: string, opts: any, handler: Function): void;
    post(path: string, handler: Function): void;
    put(path: string, opts: any, handler: Function): void;
    put(path: string, handler: Function): void;
    delete(path: string, opts: any, handler: Function): void;
    delete(path: string, handler: Function): void;
    register(plugin: Function, opts?: any): void;
    decorate(key: string, value: any): void;
    decorateRequest(key: string, value: any): void;
    addHook(name: string, fn: Function): void;
    listen(...args: any[]): Promise<any>;
  }
  export interface FastifyPluginOptions {
    [key: string]: any;
  }
  
  export default function fastify(opts?: any): FastifyInstance;
}

declare module '@fastify/cors' {
  import { FastifyPluginOptions } from 'fastify';
  function cors(opts?: FastifyPluginOptions): any;
  export default cors;
}

declare module '@fastify/sensible' {
  function sensible(opts?: any): any;
  export default sensible;
}

declare module 'zod' {
  interface ZodString { min(n: number): ZodString; max(n: number): ZodString; email(): ZodString; uuid(): ZodString; optional(): ZodOptional; }
  interface ZodNumber { min(n: number): ZodNumber; max(n: number): ZodNumber; int(): ZodNumber; optional(): ZodOptional; positive(): ZodNumber; }
  interface ZodBoolean { default(val: boolean): ZodBoolean; optional(): ZodOptional; }
  interface ZodOptional { optional(): ZodOptional; }
  interface ZodEnum<T> { optional(): ZodOptional; }
  interface ZodObject { parse(input: any): any; safeParse(input: any): { success: boolean; data?: any; error?: any }; partial(): ZodObject; }
  interface ZodArray { optional(): ZodOptional; }
  
  export class ZodError extends Error {
    errors: any[];
    issues: any[];
  }

  export const z: {
    string(): ZodString;
    number(): ZodNumber;
    boolean(): ZodBoolean;
    enum<T extends string>(values: readonly T[]): ZodEnum<T>;
    nativeEnum<T extends Record<string, any>>(values: T): ZodEnum<any>;
    object(shape: Record<string, any>): ZodObject;
    array(schema: any): ZodArray;
    optional(): ZodOptional;
    ZodError: typeof ZodError;
  };
}
