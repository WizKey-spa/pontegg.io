type Index = { key: { [value: string]: 1 | -1 }; unique?: boolean };

// export type If = Record<string, string | string[] | boolean> | boolean;

export interface If {
  [key: string]: string | string[] | boolean;
}

type WithKey<K extends string | number | symbol> = {
  [k in K]: boolean;
};

export type ApiOperation = 'get' | 'create' | 'update' | 'delete' | 'list';

type Upsert<Actor extends string | number | symbol, Resource> = {
  let?: Let<Actor, Resource>;
  set?: { [key in keyof Partial<Resource>]: any };
  validate?: string;
};

export interface Section<Actor extends string | number | symbol, Resource> {
  create?: Upsert<Actor, Resource>;
  update?: Upsert<Actor, Resource>;
  validate?: string;
  hasDocuments?: boolean;
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

export type Access<Actor extends string | number | symbol> = {
  [byRole: string]: string | boolean;
};

export type Condition<Actor, Resource> = {
  for: Actor;
  if?: If;
  validate?: string;
  set?: string;
};

export type Allowed<Actor, Resource> = Actor | Condition<Actor, Resource>;

export type Let<Actor, Resource> = Array<Allowed<Actor, Resource>>;

export type Set = { [value: string]: any };

interface CreateUpdate<Actor extends string, Resource> {
  let?: Let<Actor, Resource>;
  validate?: { [byRole: string]: string };
  set?: Set;
  responses?: {
    [value: string]: Response;
  };
}

// interface Resource {
//   state: string[];
// }

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
  create: CreateUpdate<Actor, Resource>;
  update: CreateUpdate<Actor, Resource>;
  delete: Delete<Actor, Resource>;
  list: List<Actor, Resource>;
}
