/* eslint-disable no-undef */

const { JSONParseError, ItemNotFoundError } = require("../../src/errors");
const fs = require("fs").promises;

jest.mock("node-fetch");
const fetch = require("node-fetch");

const { UNIVERSALIS_URL, DEFAULT_SERVER } = require("../../src/constants");

const TEST_SERVER_NAME = "Moogle";
const TEST_ITEM_ID = "27809";

const fetchFromUniversalis = require("../../src/fetchFromUniversalis");

test("fetch from universalis should return an object with market information about an item", async () => {
  fetch.mockImplementation(() =>
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
  fetch.mockImplementation(() =>
    Promise.resolve({
      text: () => "Not Found",
    })
  );
  return expect(
    fetchFromUniversalis(99999999, TEST_SERVER_NAME)
  ).rejects.toThrow(ItemNotFoundError);
});

test("fetchFromUniversalis should throw an JSONParseError if the response is not JSON and it is not 'Not Found'", () => {
  fetch.mockImplementation(() =>
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
  fetch.mockImplementation((url) => {
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
