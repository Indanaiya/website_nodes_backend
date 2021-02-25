/* eslint-disable no-undef */

import { JSONParseError, ItemNotFoundError } from "../../src/errors";
import { promises as fs } from "fs";

jest.mock("node-fetch");
import { mockImplementation } from "node-fetch";

import { UNIVERSALIS_URL, DEFAULT_SERVER } from "../../src/constants";

const TEST_SERVER_NAME = "Moogle";
const TEST_ITEM_ID = "27809";

import fetchFromUniversalis from "../../src/fetchFromUniversalis";

test("fetch from universalis should return an object with market information about an item", async () => {
  mockImplementation(() =>
    Promise.resolve({
      text: () =>
        fs.readFile(
          "test/jest/fetchFromUniversalisMocks/universalis.api.moogle.27809.json"
        ),
    })
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
  mockImplementation(() =>
    Promise.resolve({
      text: () => "Not Found",
    })
  );
  return expect(
    fetchFromUniversalis(99999999, TEST_SERVER_NAME)
  ).rejects.toThrow(ItemNotFoundError);
});

test("fetchFromUniversalis should throw an JSONParseError if the response is not JSON and it is not 'Not Found'", () => {
  mockImplementation(() =>
    Promise.resolve({
      text: () => "gobbledeegook",
    })
  );
  return expect(
    fetchFromUniversalis(99999999, TEST_SERVER_NAME)
  ).rejects.toThrow(JSONParseError);
});

test("fetchFromUniversalis should use the default server if no server argument is provided", async () => {
  expect.assertions(1);
  mockImplementation((url) => {
    expect(url).toEqual(`${UNIVERSALIS_URL + DEFAULT_SERVER}/${TEST_ITEM_ID}`);
    return {
      text: () =>
        fs.readFile(
          "test/jest/fetchFromUniversalisMocks/universalis.api.cerberus.27809.json"
        ),
    };
  });
  fetchFromUniversalis(TEST_ITEM_ID);
});
