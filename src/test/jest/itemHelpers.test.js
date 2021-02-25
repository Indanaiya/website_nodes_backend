/* eslint-disable no-undef */
const fs = require("fs").promises;
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoError } = require("mongodb");
const mongoose = require("mongoose");
const { ValidationError } = mongoose;

jest.mock("../../src/fetchFromUniversalis");
const fetchFromUniversalis = require("../../src/fetchFromUniversalis");

const {
  phantasmagoria: PhantasmagoriaHelpers,
  gatherable: GatherableHelpers,
} = require("../../src/itemHelpers");
const { PhantaItem, GatherableItem } = require("../../models/Item.model");
const {
  JSONParseError,
  ItemNotFoundError,
  InvalidArgumentError,
} = require("../../src/errors");
const {
  SERVERS,
  DEFAULT_SERVER,
} = require("../../src/constants");

const PHANTASMAGORIA_MATS_JSON_PATH = "res/test/phantasmagoriaMatsTest.json";
const GATHERABLE_ITEMS_JSON_PATH = "res/test/gatherableItemsTest.json";
const TEST_SERVER_NAME = "Moogle";
const TEST_SERVER_NAME_2 = "Anima";
const FAKE_SERVER_NAME = "1234";
const FAKE_SERVER_NAME_2 = "4321";
const testItemName = "Multifaceted Alumen";

describe("itemHelpersTest", () => {
  const universalisReturnValueFive = generateUniversalisReturnValue(5);

  let mongod;
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
    await PhantaItem.deleteMany();
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

      expect(await PhantasmagoriaHelpers.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);
    });

    test("adds an item to the collection and returns 0 when the item to be added to the collection is already present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      expect(await PhantasmagoriaHelpers.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(await PhantasmagoriaHelpers.addItem(...addItemArgs)).toEqual(0);
      expect((await PhantaItem.find()).length).toEqual(1);
    });

    test("adds an item to the collection and returns 1 when the item is present but information a different server is provided", async () => {
      fetchFromUniversalis
        .mockReturnValueOnce(generateUniversalisReturnValue(15))
        .mockReturnValueOnce(generateUniversalisReturnValue(10))
        .mockReturnValue(universalisReturnValueFive);

      expect(await PhantasmagoriaHelpers.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      expect(
        await PhantasmagoriaHelpers.addItem(...addItemArgs, TEST_SERVER_NAME)
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

      expect(await PhantasmagoriaHelpers.addItem(...addItemArgs)).toEqual(2);
      expect((await PhantaItem.find()).length).toEqual(1);

      return expect(
        PhantasmagoriaHelpers.addItem(
          "MultifacetedAlumen",
          addItemArgs[1],
          TEST_SERVER_NAME
        )
      ).rejects.toThrow(MongoError);
    });

    test("Will not add to collection when id is not present", async () => {
      fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);

      return expect(
        PhantasmagoriaHelpers.addItem(addItemArgs[0], {})
      ).rejects.toThrow(ValidationError);
    });

    test("Will propagate ItemNotFoundError from fetchFromUniversalis", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new ItemNotFoundError(
          `27744 is not a valid item ID for universalis`
        );
      });

      return expect(
        PhantasmagoriaHelpers.addItem(...addItemArgs)
      ).rejects.toThrow(ItemNotFoundError);
    });

    test("Will propagate ItemNotFoundError from fetchFromUniversalis", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new JSONParseError(
          `Error parsing json response from Universalis for item 24474: Fake Error`
        );
      });

      return expect(
        PhantasmagoriaHelpers.addItem(...addItemArgs)
      ).rejects.toThrow(JSONParseError);
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
              id: Number.parseInt(obj[itemName].id),
              tomestonePrice: Number.parseInt(obj[itemName].tomestonePrice),
            };
          })
        );

      await PhantasmagoriaHelpers.addAllItems(
        PHANTASMAGORIA_MATS_JSON_PATH
      ).then((promises) =>
        promises.forEach((promise) => {
          expect(promise.status).toEqual("fulfilled");
        })
      );

      const results = await PhantaItem.find();

      expect(results.length).toEqual(requiredItems.length);
      requiredItems.forEach((item) => {
        const matchingResult = results.filter(
          (resultItem) => resultItem.id === item.id
        );
        expect(matchingResult.length).toEqual(1);
        expect(matchingResult[0]).toMatchObject(item);
      });
    });

    test("displays the correct type of error when individual promises reject", async () => {
      fetchFromUniversalis.mockImplementation(() => {
        throw new JSONParseError();
      });

      const results = await PhantasmagoriaHelpers.addAllItems(
        PHANTASMAGORIA_MATS_JSON_PATH
      );
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.status).toEqual("rejected");
        expect(result.reason).toBeInstanceOf(JSONParseError);
      });
    });

    test("individual promises reject when addItem throws any error", async () => {
      const addItemMock = jest.spyOn(PhantasmagoriaHelpers, "addItem");
      addItemMock.mockImplementation(async () => {
        throw new Error();
      });

      const results = await PhantasmagoriaHelpers.addAllItems(
        PHANTASMAGORIA_MATS_JSON_PATH
      );
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.status).toEqual("rejected");
        expect(result.reason).toBeInstanceOf(Error);
      });

      addItemMock.mockRestore();
    });

    test("Throws an error if it cannot read the json", async () => {
      const readFileMock = jest.spyOn(fs, "readFile");
      readFileMock.mockImplementation(async () => {
        throw new Error();
      });

      const returnVal = await expect(
        PhantasmagoriaHelpers.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
      ).rejects.toThrow(Error);
      readFileMock.mockRestore();
      return returnVal;
    });

    test("propogates an error from reading the database", async () => {
      const findMock = jest.spyOn(mongoose.Model, "find");
      findMock.mockImplementation(async () => {
        throw new MongoError("");
      });

      const returnVal = await expect(
        PhantasmagoriaHelpers.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
      ).rejects.toThrow(MongoError);
      findMock.mockRestore();
      return returnVal;
    });
  });

  describe("getItems", () => {
    let length;

    beforeEach(async () => {
      fetchFromUniversalis.mockResolvedValue(universalisReturnValueFive);
      await PhantaItem.deleteMany();
      length = (
        await PhantasmagoriaHelpers.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
      ).length;
      if ((await PhantaItem.find()).length !== length) {
        throw new Error(
          "Mismatch between number of items in json and number of items in collection"
        );
      }
    });

    test("gets all items in the collection for default server if no server is specified", async () => {
      //Doing PhantaItem.find first ensures that all except the default server marketInfo will be undefined
      const find = await PhantaItem.find(
        {},
        `marketInfo name id tomestonePrice`
      );
      const getItems = await PhantasmagoriaHelpers.getItems();

      const getItemsBase = getItems.map(
        ({ _id, name, id, tomestonePrice }) => ({
          _id,
          name,
          id,
          tomestonePrice,
        })
      );
      const getItemsMarketInfo = getItems.map(({ marketInfo }) => ({
        marketInfo,
      }));
      const findBase = find.map(({ _id, name, id, tomestonePrice }) => ({
        _id,
        name,
        id,
        tomestonePrice,
      }));
      const findMarketInfo = find.map(({ marketInfo }) => ({
        marketInfo,
      }));

      //Just comparing find and getItems wont work so we do this:
      expect(findBase).toMatchObject(getItemsBase);
      expect(findMarketInfo).toMatchObject(getItemsMarketInfo);
    });

    test("gets prices for the servers specified and only the servers specified", async () => {
      const unexpectedServers = SERVERS.filter(
        (server) =>
          !(server === TEST_SERVER_NAME || server === TEST_SERVER_NAME_2)
      );

      const results = await PhantasmagoriaHelpers.getItems(
        TEST_SERVER_NAME,
        TEST_SERVER_NAME_2
      );
      expect(results.length).toEqual(length);

      results.forEach((result) => {
        expect(result.marketInfo?.[TEST_SERVER_NAME]).toBeDefined();
        expect(result.marketInfo?.[TEST_SERVER_NAME_2]).toBeDefined();
        unexpectedServers.forEach((server) =>
          expect(result.marketInfo?.[server].$isEmpty()).toEqual(true)
        );
      });
    });

    test("throws an error if you ask for prices for a non-existant server", async () => {
      expect.assertions(5);
      PhantasmagoriaHelpers.getItems(FAKE_SERVER_NAME).catch((err) => {
        expect(err).toBeInstanceOf(InvalidArgumentError);
      });
      PhantasmagoriaHelpers.getItems(TEST_SERVER_NAME, FAKE_SERVER_NAME).catch(
        (err) => {
          expect(err).toBeInstanceOf(InvalidArgumentError);
        }
      );
      PhantasmagoriaHelpers.getItems(
        FAKE_SERVER_NAME_2,
        FAKE_SERVER_NAME
      ).catch((err) => {
        expect(err).toBeInstanceOf(InvalidArgumentError);
      });
      PhantasmagoriaHelpers.getItems(58).catch((err) => {
        expect(err).toBeInstanceOf(InvalidArgumentError);
      });
      PhantasmagoriaHelpers.getItems({ serverName: DEFAULT_SERVER }).catch(
        (err) => {
          expect(err).toBeInstanceOf(InvalidArgumentError);
        }
      );
    });

    test("updates prices that need updating before returning", async () => {
      //relies on updateItem working
      fetchFromUniversalis.mockResolvedValue(
        generateUniversalisReturnValue(10, Date.now())
      );
      //One of the four items is already updated, so three more updates are expected
      await PhantaItem.find({ name: testItemName }).then((items) =>
        PhantasmagoriaHelpers.updateItem(
          items[0],
          TEST_SERVER_NAME,
          TEST_SERVER_NAME_2
        )
      );
      const updateItemMock = jest.spyOn(PhantasmagoriaHelpers, "updateItem");
      let numberOfUpdates = 0;
      updateItemMock.mockImplementation(async () => {
        ++numberOfUpdates;
      });
      await PhantasmagoriaHelpers.getItems(
        TEST_SERVER_NAME,
        TEST_SERVER_NAME_2
      );
      expect(numberOfUpdates).toEqual(3);

      await PhantaItem.deleteMany();
      await addOutdatedItems();
      numberOfUpdates = 0;
      await PhantaItem.find().then((
        result //console.log(result)
      ) =>
        result.forEach((item) => console.log(item.marketInfo[DEFAULT_SERVER]))
      );
      await PhantasmagoriaHelpers.getItems(DEFAULT_SERVER);
      expect(numberOfUpdates).toEqual(4);

      updateItemMock.mockRestore();
    });
  });

  describe("updateItem", () => {
    beforeEach(async () => {
      fetchFromUniversalis.mockResolvedValue(universalisReturnValueFive);
      await PhantaItem.deleteMany();
    });

    it("updates price for default server if no servers are provided", async () => {
      await addOutdatedItems();

      const oldItem = await findItem(testItemName);
      const {
        marketInfo: {
          [DEFAULT_SERVER]: { updatedAt: oldTime },
        },
      } = oldItem;

      await PhantasmagoriaHelpers.updateItem(oldItem);

      const {
        marketInfo: {
          [DEFAULT_SERVER]: { updatedAt: newTime },
        },
      } = await findItem(testItemName);

      expect(newTime.getTime()).toBeGreaterThan(oldTime.getTime());
    });

    it("only updates marketInfo for servers specified", async () => {
      await addOutdatedItems(DEFAULT_SERVER, TEST_SERVER_NAME);

      const oldItem = await findItem(testItemName);
      const {
        marketInfo: {
          [TEST_SERVER_NAME]: { updatedAt: oldTimeTest },
          [DEFAULT_SERVER]: { updatedAt: oldTimeDefault },
        },
      } = oldItem;

      await PhantasmagoriaHelpers.updateItem(oldItem, TEST_SERVER_NAME);

      const {
        marketInfo: {
          [TEST_SERVER_NAME]: { updatedAt: newTimeTest },
          [DEFAULT_SERVER]: { updatedAt: newTimeDefault },
        },
      } = await findItem(testItemName);

      expect(newTimeTest.getTime()).toBeGreaterThan(oldTimeTest.getTime());
      expect(newTimeDefault.getTime()).toEqual(oldTimeDefault.getTime());
    });

    it("can update the market info for multiple servers", async () => {
      await addOutdatedItems(TEST_SERVER_NAME, TEST_SERVER_NAME_2);

      const oldItem = await findItem(testItemName);
      const {
        marketInfo: {
          [TEST_SERVER_NAME]: { updatedAt: oldTimeTest1 },
          [TEST_SERVER_NAME_2]: { updatedAt: oldTimeTest2 },
        },
      } = oldItem;

      await PhantasmagoriaHelpers.updateItem(
        oldItem,
        TEST_SERVER_NAME,
        TEST_SERVER_NAME_2
      );

      const {
        marketInfo: {
          [TEST_SERVER_NAME]: { updatedAt: newTimeTest1 },
          [TEST_SERVER_NAME_2]: { updatedAt: newTimeTest2 },
        },
      } = await findItem(testItemName);

      expect(newTimeTest1.getTime()).toBeGreaterThan(oldTimeTest1.getTime());
      expect(newTimeTest2.getTime()).toBeGreaterThan(oldTimeTest2.getTime());
    });

    it("throws an InvalidArgumentError when given a name for a server that doesn't exist", async () => {
      await addOutdatedItems();
      const item = await findItem(testItemName);
      return expect(
        PhantasmagoriaHelpers.updateItem(item, FAKE_SERVER_NAME)
      ).rejects.toThrow(InvalidArgumentError);
    });

    it("throws an InvalidArgumentError when not given an item to update", () => {
      return expect(PhantasmagoriaHelpers.updateItem()).rejects.toThrow(
        InvalidArgumentError
      );
    });

    it("throws a TypeError when item isn't a Document", () => {
      return expect(PhantasmagoriaHelpers.updateItem({})).rejects.toThrow(
        TypeError
      );
    });

    it("throws an InvalidArgumentError when item is 'new'", () => {
      return expect(
        PhantasmagoriaHelpers.updateItem(new PhantaItem())
      ).rejects.toThrow(InvalidArgumentError);
    });

    // it("throws an error if fetchFromUniversalis is broken", async () => {
    //   await addOutdatedItems();
    //   fetchFromUniversalis.mockResolvedValueOnce({});
    //   const item = await findItem(testItemName);
    //   return expect(PhantasmagoriaHelpers.updateItem(item)).rejects;
    // });
  });

  //Updates all items, works with no server, works with one server, works with multiple servers, only updates market info for servers specified, handles illegal server names, works when there are no items to update
  describe("updateAll", () => {
    beforeEach(async () => {
      fetchFromUniversalis.mockResolvedValue(universalisReturnValueFive);
      await PhantaItem.deleteMany();
    });

    it("updates all items only for the default server when no server is specified ", async () => {
      await addOutdatedItems(DEFAULT_SERVER, TEST_SERVER_NAME);
      const oldFind = await PhantaItem.find();
      const oldTimesDefault = oldFind.map(
        (item) => item.marketInfo[DEFAULT_SERVER].updatedAt
      );
      const oldTimesTest = oldFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME].updatedAt
      );

      await PhantasmagoriaHelpers.updateAllItems();
      const newFind = await PhantaItem.find();
      const newTimesDefault = newFind.map(
        (item) => item.marketInfo[DEFAULT_SERVER].updatedAt
      );
      const newTimesTest = newFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME].updatedAt
      );

      expect(oldTimesDefault).not.toEqual(
        expect.arrayContaining(newTimesDefault)
      );
      expect(oldTimesTest).toEqual(expect.arrayContaining(newTimesTest));
    });

    it("updates all items when given a specific server and only for that server", async () => {
      await addOutdatedItems(TEST_SERVER_NAME, TEST_SERVER_NAME_2);
      const oldFind = await PhantaItem.find();
      const oldTimesTest1 = oldFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME].updatedAt
      );
      const oldTimesTest2 = oldFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME_2].updatedAt
      );

      await PhantasmagoriaHelpers.updateAllItems(TEST_SERVER_NAME);
      const newFind = await PhantaItem.find();
      const newTimesTest1 = newFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME].updatedAt
      );
      const newTimesTest2 = newFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME_2].updatedAt
      );

      expect(oldTimesTest1).not.toEqual(expect.arrayContaining(newTimesTest1));
      expect(oldTimesTest2).toEqual(expect.arrayContaining(newTimesTest2));
    });

    it("updates all items when given multiple servers and only for those servers", async () => {
      await addOutdatedItems(
        DEFAULT_SERVER,
        TEST_SERVER_NAME,
        TEST_SERVER_NAME_2
      );
      const oldFind = await PhantaItem.find();
      const oldTimesDefault = oldFind.map(
        (item) => item.marketInfo[DEFAULT_SERVER].updatedAt
      );
      const oldTimesTest1 = oldFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME].updatedAt
      );
      const oldTimesTest2 = oldFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME_2].updatedAt
      );

      await PhantasmagoriaHelpers.updateAllItems(
        TEST_SERVER_NAME,
        TEST_SERVER_NAME_2
      );
      const newFind = await PhantaItem.find();
      const newTimesDefault = newFind.map(
        (item) => item.marketInfo[DEFAULT_SERVER].updatedAt
      );
      const newTimesTest1 = newFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME].updatedAt
      );
      const newTimesTest2 = newFind.map(
        (item) => item.marketInfo[TEST_SERVER_NAME_2].updatedAt
      );

      expect(oldTimesTest1).not.toEqual(expect.arrayContaining(newTimesTest1));
      expect(oldTimesTest2).not.toEqual(expect.arrayContaining(newTimesTest2));
      expect(oldTimesDefault).toEqual(expect.arrayContaining(newTimesDefault));
    });

    it("will do nothing if given an invalid server name", async () => {
      await addOutdatedItems();
      expect.assertions(5);

      await expect(
        PhantasmagoriaHelpers.updateAllItems(FAKE_SERVER_NAME)
      ).rejects.toThrow(InvalidArgumentError);

      const oldTimesDefault1 = await PhantaItem.find().then((items) =>
        items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
      );
      await expect(
        PhantasmagoriaHelpers.updateAllItems(FAKE_SERVER_NAME, DEFAULT_SERVER)
      ).rejects.toThrow(InvalidArgumentError);
      const newTimesDefault1 = await PhantaItem.find().then((items) =>
        items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
      );

      const oldTimesDefault2 = await PhantaItem.find().then((items) =>
        items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
      );
      await expect(
        PhantasmagoriaHelpers.updateAllItems(DEFAULT_SERVER, FAKE_SERVER_NAME)
      ).rejects.toThrow(InvalidArgumentError);
      const newTimesDefault2 = await PhantaItem.find().then((items) =>
        items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
      );

      expect(oldTimesDefault1).toEqual(
        expect.arrayContaining(newTimesDefault1)
      );
      expect(oldTimesDefault2).toEqual(
        expect.arrayContaining(newTimesDefault2)
      );
    });

    it("doens't throw an error when there are no items in the collection", async () => {
      expect((await PhantaItem.find()).length).toEqual(0);
      await PhantasmagoriaHelpers.updateAllItems();
    });
  });
});

async function findItem(name) {
  const items = await PhantaItem.find({ name });
  if (items.length !== 1) {
    throw new Error("A different number of items than expected was found");
  }
  return items[0];
}

function generateUniversalisReturnValue(value, lastUploadTime = 1597591027779) {
  return {
    listings: [{ pricePerUnit: value }],
    regularSaleVelocity: value,
    nqSaleVelocity: value,
    hqSaleVelocity: value,
    averagePrice: value,
    averagePriceNQ: value,
    averagePriceHQ: value,
    lastUploadTime,
  };
}

async function addOutdatedItems(...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }
  return fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH)
    .then((json) => JSON.parse(json))
    .then(async (obj) => {
      const universalisObj = await fetchFromUniversalis();
      return Promise.all(
        Object.keys(obj).map(async (key) => {
          const marketInfo = {};
          servers.forEach(
            (server) =>
              (marketInfo[server] = {
                price: universalisObj.listings[0].pricePerUnit,
                saleVelocity: {
                  overall: universalisObj.regularSaleVelocity,
                  nq: universalisObj.nqSaleVelocity,
                  hq: universalisObj.hqSaleVelocity,
                },
                avgPrice: {
                  overall: universalisObj.averagePrice,
                  nq: universalisObj.averagePriceNQ,
                  hq: universalisObj.averagePriceHQ,
                },
                lastUploadTime: universalisObj.lastUploadTime,
                updatedAt: new Date(0).toString(),
              })
          );
          return new PhantaItem({
            name: key,
            id: obj[key].id,
            tomestonePrice: obj[key].tomestonePrice,
            marketInfo: marketInfo,
          }).save();
        })
      );
    });
}

function generateMarketInfoReturnValue(value) {
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
