import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoError } from "mongodb";
import * as mongoose from "mongoose";
import * as fs from "fs/promises";

import { mockFunction } from "./mockFunction.js";
jest.mock("../src/fetchFromUniversalis.js");
import fFU from "../src/fetchFromUniversalis.js";
const fetchFromUniversalis = mockFunction(fFU);

import {
  addItemReturn,
  getMarketInfo,
  ItemHelper,
  phantasmagoriaItemHelper,
} from "../src/itemHelpers.js";
import {
  IProtoItem,
  IProtoItemBaseDocument,
  PhantaItem,
} from "../models/Item.model.js";
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

/**
 * Runs a full gamut of tests on an ItemHelpers object
 * @param itemHelper
 */
function describeItemHelper<DocType extends IProtoItemBaseDocument, ItemType extends IProtoItem>(
  itemHelper: ItemHelper<DocType, ItemType>,
  addItemArg: ItemType
) {
  describe("addItem", () => {
    test("adds an item to the collection and returns addItemReturn.ADDED when that item wasn't already present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await itemHelper.addItem(addItemArg)).toEqual(addItemReturn.ADDED);
      //TODO test that the item saved has all of the expected values
      const phantaSearchResults = await PhantaItem.find();
      if (phantaSearchResults.length !== 1) {
        fail(
          `phantaSearchResult's length was not 1, it was ${phantaSearchResults.length}`
        );
      }
    });

    test("adds an item to the collection and returns addItemReturn.ALREADY_PRESENT when the item to be added to the collection is already present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await itemHelper.addItem(addItemArg)).toEqual(addItemReturn.ADDED);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(await itemHelper.addItem(addItemArg)).toEqual(addItemReturn.ALREADY_PRESENT);
      expect((await PhantaItem.find()).length).toEqual(1);
    });
  });

  describe("addAllItems", () => {
    test("adds all items in a provided json to the collection", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      const requiredItems = await fs
        .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
        .then((data) => JSON.parse(data))
        .then((obj) =>
          Object.keys(obj).map((itemName) => {
            return {
              name: itemName,
              universalisId: Number.parseInt(obj[itemName].universalisId),
              tomestonePrice: Number.parseInt(obj[itemName].tomestonePrice),
            };
          })
        );

      await itemHelper
        .addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
        .then((promises) =>
          promises.forEach((promise) => {
            expect(promise.status).toEqual("fulfilled");
          })
        );

      const results = await PhantaItem.find();

      expect(results.length).toEqual(requiredItems.length);
      requiredItems.forEach((item) => {
        const matchingResult = results.filter(
          (resultItem) => resultItem.universalisId === item.universalisId
        );
        expect(matchingResult.length).toEqual(1);
        expect(matchingResult[0]).toMatchObject(item);
      });
    });

    test("individual promises reject when addItem throws any error", async () => {
      const addItemMock = jest.spyOn(itemHelper, "addItem");
      addItemMock.mockImplementation(async () => {
        throw new Error();
      });

      const results = await itemHelper.addAllItems(
        PHANTASMAGORIA_MATS_JSON_PATH
      );
      expect(results.length).toBeGreaterThan(0);
      await Promise.all(
        results.map(async (result: any) => {
          Promise.all([
            expect(result.status).toEqual("rejected"),
            expect((await result).reason).toBeInstanceOf(Error),
          ]);
        })
      );
      addItemMock.mockRestore();
    });

    test("Throws an error if it cannot read the json", async () => {
      const readFileMock = jest.spyOn(fs, "readFile");
      readFileMock.mockImplementation(async () => {
        throw new Error();
      });

      const returnVal = await expect(
        itemHelper.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
      ).rejects.toThrow(Error);
      readFileMock.mockRestore();
      return returnVal;
    });
  });
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

  describeItemHelper(phantasmagoriaItemHelper, {
    name: testItemName,
    universalisId: 27744,
    tomestonePrice: 5,
  });
});
