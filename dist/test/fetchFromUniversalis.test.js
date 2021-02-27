"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fetchFromUniversalis_1 = require("../src/fetchFromUniversalis");
const mockFunction_1 = require("./mockFunction");
jest.mock("node-fetch");
const node_fetch_1 = require("node-fetch");
const promises_1 = require("fs/promises");
const constants_1 = require("../src/constants");
const errors_1 = require("../src/errors");
const TEST_SERVER_NAME = "Moogle";
const TEST_ITEM_ID = "27809";
const fetch = mockFunction_1.mockFunction(node_fetch_1.default);
test("fetch from universalis should return an object with market information about an item", () => __awaiter(void 0, void 0, void 0, function* () {
    expect.assertions(8);
    fetch.mockImplementation(() => mockFunction_1.mockFetchResponse(promises_1.readFile("./src/test/jest/fetchFromUniversalisMocks/universalis.api.moogle.27809.json")));
    const { lastUploadTime, listings, regularSaleVelocity, nqSaleVelocity, hqSaleVelocity, averagePrice, averagePriceNQ, averagePriceHQ, } = yield fetchFromUniversalis_1.default(TEST_ITEM_ID, TEST_SERVER_NAME);
    expect(lastUploadTime).toBeDefined();
    expect(listings).toBeDefined();
    expect(regularSaleVelocity).toBeDefined();
    expect(nqSaleVelocity).toBeDefined();
    expect(hqSaleVelocity).toBeDefined();
    expect(averagePrice).toBeDefined();
    expect(averagePriceNQ).toBeDefined();
    expect(averagePriceHQ).toBeDefined();
}));
test("fetchFromUniversalis should throw an ItemNotFoundError if one attempts to find marketInfo for an invalid ID", () => {
    expect.assertions(1);
    fetch.mockImplementation(() => mockFunction_1.mockFetchResponse("Not Found"));
    expect(fetchFromUniversalis_1.default(99999999, TEST_SERVER_NAME)).rejects.toThrow(errors_1.ItemNotFoundError);
});
test("fetchFromUniversalis should throw an JSONParseError if the response is not JSON and it is not 'Not Found'", () => {
    expect.assertions(1);
    fetch.mockImplementation(() => mockFunction_1.mockFetchResponse("gobbledeegook"));
    expect(fetchFromUniversalis_1.default(99999999, TEST_SERVER_NAME)).rejects.toThrow(errors_1.JSONParseError);
});
test("fetchFromUniversalis should use the default server if no server argument is provided", () => __awaiter(void 0, void 0, void 0, function* () {
    expect.assertions(1);
    fetch.mockImplementation((url) => {
        expect(url).toEqual(`${constants_1.UNIVERSALIS_URL + constants_1.DEFAULT_SERVER}/${TEST_ITEM_ID}`);
        return mockFunction_1.mockFetchResponse(promises_1.readFile("./src/test/jest/fetchFromUniversalisMocks/universalis.api.cerberus.27809.json"));
    });
    fetchFromUniversalis_1.default(TEST_ITEM_ID);
}));
//# sourceMappingURL=fetchFromUniversalis.test.js.map