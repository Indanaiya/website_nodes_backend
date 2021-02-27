import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoError } from "mongodb";
import * as mongoose from "mongoose";

import { mockFunction } from "./mockFunction.js";
jest.mock("../src/fetchFromUniversalis.js");
import fFU from "../src/fetchFromUniversalis.js";
const fetchFromUniversalis = mockFunction(fFU);

import { phantasmagoriaItemHelper, getMarketInfo } from "../src/itemHelpers.js";
import { PhantaItem } from "../models/Item.model.js";
import {
  JSONParseError,
  ItemNotFoundError,
  InvalidArgumentError,
} from "../src/errors.js";
import { SERVERS, DEFAULT_SERVER } from "../src/constants";

const PHANTASMAGORIA_MATS_JSON_PATH = "res/test/phantasmagoriaMatsTest.json";
const GATHERABLE_ITEMS_JSON_PATH = "res/test/gatherableItemsTest.json";
const TEST_SERVER_NAME = "Moogle";
const TEST_SERVER_NAME_2 = "Anima";
const FAKE_SERVER_NAME = "1234";
const FAKE_SERVER_NAME_2 = "4321";
const testItemName = "Multifaceted Alumen";
const universalisReturnValueFive = generateUniversalisReturnValue(5);

/**
 * Create an object representing a pretend return value from universalis
 * @param value
 * @param lastUploadTime
 */
function generateUniversalisReturnValue(
  value: number,
  lastUploadTime = 1597591027779
) {
  return Promise.resolve({
    listings: [{ pricePerUnit: value }],
    regularSaleVelocity: value,
    nqSaleVelocity: value,
    hqSaleVelocity: value,
    averagePrice: value,
    averagePriceNQ: value,
    averagePriceHQ: value,
    lastUploadTime,
  });
}

/**
 * Create a valid marketInfo object
 * @param value
 */
function generateMarketInfoReturnValue(value: number) {
  return {
    avgPrice: {
      hq: value,
      nq: value,
      overall: value,
    },
    lastUploadTime: new Date(1597591027779),
    price: value,
    saleVelocity: { hq: value, nq: value, overall: value },
  };
}

describe("getMarketInfo", () => {
  test("calls fetchFromUniversalis for the supplied item id and server, then returns a ServerPrices object corresponding to the recieved information", async () => {
    expect.assertions(5);
    fetchFromUniversalis.mockImplementation(
      (universalisId: number | string, server?: string) =>
        (universalisId === 5 || universalisId === "5") && server === "Cerberus"
          ? universalisReturnValueFive
          : fail("called fetchFromUniversalis with the incorrect parameters")
    );

    const time = Date.now();
    const {
      listings: {
        0: { pricePerUnit },
      },
      regularSaleVelocity,
      nqSaleVelocity,
      hqSaleVelocity,
      averagePrice,
      averagePriceNQ,
      averagePriceHQ,
      lastUploadTime,
    } = await universalisReturnValueFive;
    const marketInfo = await getMarketInfo(5, "Cerberus");

    expect(marketInfo.price).toEqual(pricePerUnit);
    expect(marketInfo.saleVelocity).toEqual({
      overall: regularSaleVelocity,
      nq: nqSaleVelocity,
      hq: hqSaleVelocity,
    });
    expect(marketInfo.avgPrice).toEqual({
      overall: averagePrice,
      nq: averagePriceNQ,
      hq: averagePriceHQ,
    });
    expect(marketInfo.lastUploadTime).toEqual(lastUploadTime);
    expect(Number.parseInt(marketInfo.updatedAt)).toBeGreaterThanOrEqual(time);
  });
});

describe("itemHelpersTest", () => {
  let mongod: MongoMemoryServer;
  beforeAll(async () => {
    mongod = new MongoMemoryServer();
    await mongoose
      .connect(await mongod.getUri(), {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
      })
      .then(() => console.log("Mongoose connected to mongod"))
      .catch((err) => {
        console.log("Mongoose failed to connect to mongod: " + err);
        throw err;
      });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await PhantaItem.deleteMany({});
    if ((await PhantaItem.find()).length !== 0) {
      throw new Error("Some items in the collection weren't deleted");
    }
  });

  describe("addItem", () => {
    const addItemArg = {
      name: testItemName,
      universalisId: 27744,
      tomestonePrice: 5,
    };

    test("adds an item to the collection and returns 2 when adding a new item to the collection", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(addItemArg)).toEqual(2);
      //TODO test that the item saved has all of the expected values
      const phantaSearchResults = await PhantaItem.find();
      if (phantaSearchResults.length !== 1) {
        fail(
          `phantaSearchResult's length was not 1, it was ${phantaSearchResults.length}`
        );
      } else {
        console.log(phantaSearchResults);
      }
    });

    test("adds an item to the collection and returns 0 when the item to be added to the collection is already present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(addItemArg)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(await phantasmagoriaItemHelper.addItem(addItemArg)).toEqual(0);
      expect((await PhantaItem.find()).length).toEqual(1);
    });

    test("adds an item to the collection and returns 1 when the item is present but information a different server is provided", async () => {
      fetchFromUniversalis
        .mockReturnValueOnce(generateUniversalisReturnValue(15))
        .mockReturnValueOnce(generateUniversalisReturnValue(10))
        .mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(addItemArg)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(
        await phantasmagoriaItemHelper.addItem(addItemArg, TEST_SERVER_NAME)
      ).toEqual(1);

      const expectedCollectionValue = {
        marketInfo: {
          Cerberus: generateMarketInfoReturnValue(15),
          Moogle: generateMarketInfoReturnValue(10),
        },
        name: testItemName,
        universalisId: 27744,
        tomestonePrice: 5,
      };
      const collection = await PhantaItem.find();

      expect(collection[0]).toMatchObject(expectedCollectionValue);
      expect(collection.length).toEqual(1);
    });

    test("Will propagate ItemNotFoundError from fetchFromUniversalis", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new ItemNotFoundError(
          `27744 is not a valid item ID for universalis`
        );
      });

      return expect(
        phantasmagoriaItemHelper.addItem(addItemArg)
      ).rejects.toThrow(ItemNotFoundError);
    });

    test("Will propagate ItemNotFoundError from fetchFromUniversalis", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new JSONParseError(
          `Error parsing json response from Universalis for item 24474: Fake Error`
        );
      });

      return expect(
        phantasmagoriaItemHelper.addItem(addItemArg)
      ).rejects.toThrow(JSONParseError);
    });
  });
});
