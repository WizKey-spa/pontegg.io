import { Readable } from 'stream';
import { testFileContent } from './testdata';

export const getMockReadable = () => {
  const mockReadable = new Readable();
  mockReadable.push(testFileContent);
  mockReadable.push(null);
  return mockReadable;
};

export const getMockBuffer = () => {
  const mockReadable = new Readable();
  mockReadable.push(testFileContent);
  mockReadable.push(null);
  return mockReadable;
};

export const logMock = {
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};
