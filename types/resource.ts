import { ObjectId } from 'mongodb';

interface Resource {
  _id: ObjectId;
  state: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export default Resource;
