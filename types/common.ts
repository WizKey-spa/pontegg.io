// import * as Keycloak from 'keycloak-connect';
import { ObjectId } from 'mongodb';

export type TypeOfId<T> = T extends { _id: any } ? T['_id'] : ObjectId;
export type Projected<T, P extends Array<keyof T>> = Pick<T, P[number]> & {
  _id: TypeOfId<T>;
};
export type Order<T> = Partial<Record<keyof T, -1 | 1>>;

export type WithId<Type> = Type & { _id: ObjectId; id?: string };

// eslint-disable-next-line max-classes-per-file
// https://github.com/ThomasAribart/json-schema-to-ts#deserialization
export type DeserializeDate = {
  deserialize: [
    {
      pattern: {
        type: 'string';
        format: 'date-time';
      };
      output: Date;
    },
    {
      pattern: {
        type: 'string';
        format: 'date';
      };
      output: Date;
    },
  ];
};

export interface Timestamped {
  updatedAt?: Date;
}

export interface Cursor<T, K extends keyof T> {
  field: K;
  from?: T[K];
  limit?: number;
}

export enum LANGUAGES {
  EN = 'en',
  IT = 'it',
}
