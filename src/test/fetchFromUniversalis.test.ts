import fetchFromUniversalis from "../src/fetchFromUniversalis";
import {mockFunction, mockFetchResponse} from "./mockFunction"

jest.mock("node-fetch");
import nodeFetch from "node-fetch";
import { readFile } from "fs/promises";

import { UNIVERSALIS_URL, DEFAULT_SERVER } from "../src/constants";
import { ItemNotFoundError, JSONParseError } from "../src/errors";

const TEST_SERVER_NAME = "Moogle";
const TEST_ITEM_ID = "27809";

const fetch = mockFunction(nodeFetch);

test("fetch from universalis should return an object with market information about an item", async () => {
  expect.assertions(8);
  fetch.mockImplementation(() =>
    mockFetchResponse(
      readFile(
        "./src/test/jest/fetchFromUniversalisMocks/universalis.api.moogle.27809.json"
      )
    )
  );

  const {
    lastUploadTime,
    listings,
    regularSaleVelocity,
    nqSaleVelocity,
    hqSaleVelocity,
    averagePrice,
    averagePriceNQ,
    averagePriceHQ,
  } = await fetchFromUniversalis(TEST_ITEM_ID, TEST_SERVER_NAME);

  expect(lastUploadTime).toBeDefined();
  expect(listings).toBeDefined();
  expect(regularSaleVelocity).toBeDefined();
  expect(nqSaleVelocity).toBeDefined();
  expect(hqSaleVelocity).toBeDefined();
  expect(averagePrice).toBeDefined();
  expect(averagePriceNQ).toBeDefined();
  expect(averagePriceHQ).toBeDefined();
});

test("fetchFromUniversalis should throw an ItemNotFoundError if one attempts to find marketInfo for an invalid ID", () => {
  expect.assertions(1);

  fetch.mockImplementation(() => mockFetchResponse("Not Found"));

  expect(fetchFromUniversalis(99999999, TEST_SERVER_NAME)).rejects.toThrow(
    ItemNotFoundError
  );
});

test("fetchFromUniversalis should throw an JSONParseError if the response is not JSON and it is not 'Not Found'", () => {
  expect.assertions(1);

  fetch.mockImplementation(() => mockFetchResponse("gobbledeegook"));

  expect(fetchFromUniversalis(99999999, TEST_SERVER_NAME)).rejects.toThrow(
    JSONParseError
  );
});

test("fetchFromUniversalis should use the default server if no server argument is provided", async () => {
  expect.assertions(1);

  fetch.mockImplementation((url) => {
    expect(url).toEqual(`${UNIVERSALIS_URL + DEFAULT_SERVER}/${TEST_ITEM_ID}`);
    return mockFetchResponse(
      readFile(
        "./src/test/jest/fetchFromUniversalisMocks/universalis.api.cerberus.27809.json"
      )
    );
  });

  fetchFromUniversalis(TEST_ITEM_ID);
});
