import { Response } from "node-fetch";

// From https://instil.co/blog/typescript-testing-tips-mocking-functions-with-jest/
export function mockFunction<T extends (...args: any[]) => any>(
  fn: T
): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

export function mockFetchResponse(text: Promise<Buffer> | string) {
  return Promise.resolve(({
    text: () => text,
  } as unknown) as Response);
  // It's nothing like Response but this makes typescript happy and since it's in a test not the actual program I think it's ok
}
