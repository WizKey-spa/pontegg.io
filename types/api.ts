import { User } from './auth';

type Index = { key: { [value: string]: 1 | -1 }; unique?: boolean };

// export type If = Record<string, string | string[] | boolean> | boolean;

export interface If {
  [key: string]: string | string[] | boolean;
}

export type ApiOperation = 'get' | 'create' | 'update' | 'delete';

export type Set<Resource> = { [key in keyof Partial<Resource>]: Resource[key] };

type Upsert<Actor extends string | number | symbol, Resource> = {
  let?: Let<Actor, Resource>;
  set?: { [key in keyof Partial<Resource>]: Resource[key] };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Doc = { mimeTypes: string[] };

export interface Section<Actor extends string | number | symbol, Resource> {
  create?: Upsert<Actor, Resource>;
  update?: Upsert<Actor, Resource>;
  delete?: { let?: Let<Actor, Resource> };
  validate?: string;
  document?: { mimeTypes: string[]; maxSize?: number };
  documents?: { mimeTypes: string[]; maxCount: number };
  versioned?: boolean;
}

type Response = {
  description: string;
  content?: {
    'application/json': {
      schema: any;
    };
  };
  schema?: any;
  type?: any;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Access<Actor extends string | number | symbol> = {
  [byRole: string]: string | boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Condition<Actor, Resource> = {
  for: Actor;
  if?: If;
  validate?: string;
  set?: string;
};

export type Allowed<Actor, Resource> = Actor | Condition<Actor, Resource>;

export type Let<Actor, Resource> = Array<Allowed<Actor, Resource>>;

interface CreateUpdate<Actor extends string, Resource> {
  let?: Let<Actor, Resource>;
  validate?: { [byRole: string]: string };
  set?: Set<Resource>;
  responses?: {
    [value: string]: Response;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getTypeofProperty<T, K extends keyof T>(o: T, name: K) {
  return typeof o[name];
}

export interface Get<Actor, Resource> {
  let?: Let<Actor, Resource>;
  responses?: {
    [value: string]: Response;
  };
}

export interface Delete<Actor, Resource> {
  let?: Let<Actor, Resource>;
}

export interface List<Actor, Resource> {
  let?: Let<Actor, Resource>;
  projection: string[];
  query: string[];
}

export default interface API<Actor extends string, Resource> {
  scheme: any;
  resourceSchemeName: string;
  states: readonly string[];
  indexes: Index[];
  sections: {
    [sectionName in keyof Partial<Resource>]: Section<Actor, Resource>;
  };
  get: Get<Actor, Resource>;
  create?: CreateUpdate<Actor, Resource>;
  update?: CreateUpdate<Actor, Resource>;
  delete?: Delete<Actor, Resource>;
  list: List<Actor, Resource>;
  coerceFields?: Record<string, string[]>;
}

export interface SseMsg<Resource> {
  timestamp: string;
  actor: User;
  operation: ApiOperation;
  diff: Partial<Resource>;
  sectionName?: string;
}
