"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFetchResponse = exports.mockFunction = void 0;
// From https://instil.co/blog/typescript-testing-tips-mocking-functions-with-jest/
function mockFunction(fn) {
    return fn;
}
exports.mockFunction = mockFunction;
function mockFetchResponse(text) {
    return Promise.resolve({
        text: () => text,
    });
    // It's nothing like Response but this makes typescript happy and since it's in a test not the actual program I think it's ok
}
exports.mockFetchResponse = mockFetchResponse;
//# sourceMappingURL=mockFunction.js.map