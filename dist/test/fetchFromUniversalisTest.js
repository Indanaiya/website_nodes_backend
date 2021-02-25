/* eslint-disable no-undef */
import { assert } from "chai";
import fetchFromUniversalis from "../src/fetchFromUniversalis";
import { JSONParseError } from "../src/errors";

const TEST_SERVER_NAME = "Moogle";
const TEST_ITEM_ID = "27809";
const DEFAULT_SERVER_WORLD_ID = 80; //Cerberus' world id. Will need changing if the default server changes

describe("Fetch From Universalis", function () {
  it("should return an object with market information about an item", async function () {
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
    assert.notEqual(lastUploadTime, undefined);
    assert.notEqual(listings, undefined);
    assert.notEqual(regularSaleVelocity, undefined);
    assert.notEqual(nqSaleVelocity, undefined);
    assert.notEqual(hqSaleVelocity, undefined);
    assert.notEqual(averagePrice, undefined);
    assert.notEqual(averagePriceNQ, undefined);
    assert.notEqual(averagePriceHQ, undefined);
  });

  it("should throw a JSONParseError if it cannot parse the recieved response", async function () {
    //At time of writing, this is an invalid item id, and the response to invalid item Ids is not JSON
    return fetchFromUniversalis(9999999, TEST_SERVER_NAME)
      .then(() => assert.fail("did not throw any error"))
      .catch((err) => assert.instanceOf(err, JSONParseError));
  });

  it("should use default server if no server argument is provided", async function () {
    fetchFromUniversalis(TEST_ITEM_ID).then(({ worldID }) =>
      assert.equal(worldID, DEFAULT_SERVER_WORLD_ID)
    );
  });
});
