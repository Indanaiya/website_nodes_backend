import {MongoMemoryServer} from "mongodb-memory-server";
import MongoError from "mongodb";
import * as mongoose from "mongoose";

import mockFunction from "./mockFunction"
jest.mock("../src/fetchFromUniversalis")
import fFU from "../src/fetchFromUniversalis";
const fetchFromUniversalis = mockFunction(fFU);

import {phantasmagoriaItemHelper} from "../src/itemHelpers";
import {PhantaItem} from "../models/Item.model";
import {JSONParseError, ItemNotFoundError, InvalidArgumentError} from "../src/errors";
import {SERVERS, DEFAULT_SERVER} from "../src/constants";

const PHANTASMAGORIA_MATS_JSON_PATH = "res/test/phantasmagoriaMatsTest.json";
const GATHERABLE_ITEMS_JSON_PATH = "res/test/gatherableItemsTest.json";
const TEST_SERVER_NAME = "Moogle";
const TEST_SERVER_NAME_2 = "Anima";
const FAKE_SERVER_NAME = "1234";
const FAKE_SERVER_NAME_2 = "4321";
const testItemName = "Multifaceted Alumen";

/**
 * Create an object representing a pretend return value from universalis
 * @param value 
 * @param lastUploadTime 
 */
function generateUniversalisReturnValue(value: number, lastUploadTime = 1597591027779) {
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

describe("itemHelpersTest", () => {
  const universalisReturnValueFive = generateUniversalisReturnValue(5);

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
    const addItemArgs = [
      testItemName,
      {
        id: "27744",
        tomestonePrice: "5",
      },
    ];

    test("adds an item to the collection and returns 2 when adding a new item to the collection", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(testItemName, {universalisId: 27744, tomestonePrice: 5})).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);
    });

    test("adds an item to the collection and returns 0 when the item to be added to the collection is already present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(await phantasmagoriaItemHelper.addItem(...addItemArgs)).toEqual(0);
      expect((await PhantaItem.find()).length).toEqual(1);
    });

    test("adds an item to the collection and returns 1 when the item is present but information a different server is provided", async () => {
      fetchFromUniversalis
        .mockReturnValueOnce(generateUniversalisReturnValue(15))
        .mockReturnValueOnce(generateUniversalisReturnValue(10))
        .mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(
        await phantasmagoriaItemHelper.addItem(...addItemArgs, TEST_SERVER_NAME)
      ).toEqual(1);

      const expectedCollectionValue = {
        marketInfo: {
          Cerberus: generateMarketInfoReturnValue(15),
          Moogle: generateMarketInfoReturnValue(10),
        },
        name: testItemName,
        id: 27744,
        tomestonePrice: 5,
      };
      const collection = await PhantaItem.find();

      expect(collection[0]).toMatchObject(expectedCollectionValue);
      expect(collection.length).toEqual(1);
    });

    test("Handles addition of two different items with the same id gracefully", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await phantasmagoriaItemHelper.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      return expect(
        phantasmagoriaItemHelper.addItem(
          "MultifacetedAlumen",
          addItemArgs[1],
          TEST_SERVER_NAME
        )
      ).rejects.toThrow(MongoError);
    });

    test("Will not add to collection when id is not present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      return expect(
        phantasmagoriaItemHelper.addItem(addItemArgs[0], {})
      ).rejects.toThrow(ValidationError);
    });

    test("Will propagate ItemNotFoundError from fetchFromUniversalis", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new ItemNotFoundError(
          `27744 is not a valid item ID for universalis`
        );
      });

      return expect(
        phantasmagoriaItemHelper.addItem(...addItemArgs)
      ).rejects.toThrow(ItemNotFoundError);
    });

    test("Will propagate ItemNotFoundError from fetchFromUniversalis", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new JSONParseError(
          `Error parsing json response from Universalis for item 24474: Fake Error`
        );
      });

      return expect(
        phantasmagoriaItemHelper.addItem(...addItemArgs)
      ).rejects.toThrow(JSONParseError);
    });
  });
});
