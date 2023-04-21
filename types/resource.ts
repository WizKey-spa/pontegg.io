interface Resource {
  state: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export default Resource;
