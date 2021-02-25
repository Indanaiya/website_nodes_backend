// From https://instil.co/blog/typescript-testing-tips-mocking-functions-with-jest/
export default function mockFunction<T extends (...args: any[]) => any>(
  fn: T
): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}
