import { WithId } from 'mongodb';

export interface ResourceBase {
  state?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // [sectionName: string]: any;
}

// export interface Resourced<T> {
//   _id: ObjectId;
//   userId: string;
//   createdAt?: Date;
//   updatedAt?: Date;
//   [K in  T]: [K in T];
// }
type Sections<T> = { [P in keyof T]: T[P] };

export type Resource<T> = WithId<ResourceBase & Sections<T>>;

export type Cursor = {
  field?: string;
  from?: string;
  state?: string;
  search?: string;
};
