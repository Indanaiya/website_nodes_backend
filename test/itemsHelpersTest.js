/* eslint-disable no-undef */
const assert = require("chai").assert;
const {
  phantasmagoria: PhantasmagoriaHelpers,
  gatherable: GatherableHelpers,
} = require("../src/itemHelpers");
const {
  PHANTASMAGORIA_MATS_JSON_PATH,
  ITEM_TTL,
  DEFAULT_SERVER,
  GATHERABLE_ITEMS_JSON_PATH,
} = require("../src/constants");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { PhantaItem, GatherableItem } = require("../models/Item.model");
const { InvalidArgumentError } = require("../src/errors");

require("dotenv").config();

const uri = process.env.ATLAS_URI;
const TEST_SERVER_NAME = "Moogle";

//TODO Add a test to make sure that items aren't updated if they don't need to be
describe("Phantasmagoria Helpers", function () {
  const TEST_ITEM_NAME = "Tempest Adhesive";
  let phantaMats = null;

  before(async () => {
    PhantaItem.find().deleteMany();
    return await Promise.all([
      mongoose
        .connect(uri, {
          useNewUrlParser: true,
          useCreateIndex: true,
          useUnifiedTopology: true,
        })
        .then(() => console.log("Connected to MongoDB Atlas"))
        .catch((err) => {
          console.log("Failed to connect to MongoDB Atlas: " + err);
          throw err;
        }),
      (phantaMats = await fs
        .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
        .then((json) => JSON.parse(json))),
    ]);
  });

  describe("addAllItems", function () {
    it("addAllItems should add all items in the json to the db", async function () {
      //Empty the items collection
      await PhantaItem.deleteMany({});
      const items = await PhantaItem.find();
      assert.equal(items.length, 0);

      await PhantasmagoriaHelpers.addAllItems();
      const presentItems = await PhantaItem.find();
      const missingItems = Object.keys(phantaMats).filter((requiredItem) =>
        presentItems.includes(requiredItem)
      );
      assert.equal(missingItems.length, 0);
    });
  });

  describe("getItems", function () {
    it("getItems should only return up to date items", async function () {
      const items = await PhantasmagoriaHelpers.getItems();
      const outOfDateItems = items.filter((item) => {
        const itemTime = new Date(item.marketInfo[DEFAULT_SERVER].updatedAt);
        return Date.now() > itemTime.getTime() + ITEM_TTL * 1000;
      });
      assert.equal(outOfDateItems.length, 0);
    });

    it("getItems should return all items in the items collection", async function () {
      return Promise.all([
        PhantasmagoriaHelpers.getItems().then((items) =>
          items.map((item) => item.name)
        ),
        PhantaItem.find().then((items) => items.map((item) => item.name)),
      ])
        .then((results) => {
          return results[1].filter((item) => !results[0].includes(item));
        })
        .then((itemsInJsonButNotInCollection) =>
          assert.equal(itemsInJsonButNotInCollection.length, 0)
        );
    });
  });

  describe("addItem", async function () {
    before(async () => await PhantaItem.deleteMany({}));

    it("addItem should add a supplied item that doesn't exist to the collection", async function () {
      assert.equal(
        await PhantasmagoriaHelpers.addItem(
          TEST_ITEM_NAME,
          phantaMats[TEST_ITEM_NAME]
        ),
        2
      );
      const savedItems = await PhantaItem.find({
        name: TEST_ITEM_NAME,
      }).catch(() =>
        assert.fail("More than one item with the same name found")
      );
      if (savedItems.length != 1) {
        assert.fail("More than one item with the same name found");
      }
      const savedItem = savedItems[0];
      assert.equal(savedItem.name, TEST_ITEM_NAME);
      assert.notEqual(savedItem.marketInfo[DEFAULT_SERVER], undefined);
      assert.notEqual(savedItem.marketInfo[DEFAULT_SERVER].price, undefined);
      assert.notEqual(
        savedItem.marketInfo[DEFAULT_SERVER].updatedAt,
        undefined
      );
    });

    it("addItem add the price for a new server for an item that already exists in the collection", async function () {
      assert.equal(
        await PhantasmagoriaHelpers.addItem(
          TEST_ITEM_NAME,
          phantaMats[TEST_ITEM_NAME],
          TEST_SERVER_NAME
        ),
        1
      );
      const savedItems = await PhantaItem.find({
        name: TEST_ITEM_NAME,
      }).catch(() =>
        assert.fail("More than one item with the same name found")
      );
      if (savedItems.length != 1) {
        assert.fail("More than one item with the same name found");
      }
      const savedItem = savedItems[0];
      assert.equal(savedItem.name, TEST_ITEM_NAME);
      assert.notEqual(savedItem.marketInfo[TEST_SERVER_NAME], undefined);
      assert.notEqual(savedItem.marketInfo[TEST_SERVER_NAME].price, undefined);
      assert.notEqual(
        savedItem.marketInfo[TEST_SERVER_NAME].updatedAt,
        undefined
      );
    });

    it("addItem should return 0 if one attempts to add an item that already exists to the collection", async function () {
      assert.equal(
        await PhantasmagoriaHelpers.addItem(
          TEST_ITEM_NAME,
          phantaMats[TEST_ITEM_NAME]
        ),
        0
      );
    });
  });

  describe("updateItem", function () {
    it("updateItem should update an Item", async function () {
      let oldDate = null;

      //Get the date of the item, ITEM_NAME, as it is currently saved and then call updateItem on it
      await PhantaItem.find({ name: TEST_ITEM_NAME })
        .then((items) => {
          if (items.length !== 1) {
            throw new Error("Items.length should have been 1");
          }
          return items[0];
        })
        .then((item) => {
          oldDate = item.marketInfo[DEFAULT_SERVER].updatedAt;
          return item;
        })
        .then((item) => PhantasmagoriaHelpers.updateItem(item));

      //Check that the item was updated
      const items = await PhantaItem.find({ name: TEST_ITEM_NAME });
      if (items.length !== 1) {
        throw new Error(
          `Items.length should have been 1. Was actually ${items.length}`
        );
      }
      const item = items[0];
      assert.notEqual(item.updatedAt, oldDate);
    });

    it("updateItem with string instead of document", async function () {
      return PhantasmagoriaHelpers.updateItem("Gobbledeegoop")
        .then(() =>
          assert.fail(
            "updateItem with string instead of document did not throw an error"
          )
        )
        .catch((err) => assert.instanceOf(err, TypeError));
    });

    it("updateItem with unsaved document", async function () {
      return PhantasmagoriaHelpers.updateItem(new PhantaItem({}))
        .then(() =>
          assert.fail("updateItem with unsaved document did not throw an error")
        )
        .catch((err) => assert.instanceOf(err, InvalidArgumentError));
    });
  });

  describe("updateAllItems", function () {
    it("updateAllItems updates all items in the collection", async function () {
      const oldTimes = await PhantaItem.find().then((items) =>
        items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
      );

      await PhantasmagoriaHelpers.updateAllItems();

      const nonUpdatedItems = await PhantaItem.find().then((items) =>
        items.filter(
          (item, index) =>
            item.marketInfo[DEFAULT_SERVER].updatedAt < oldTimes[index]
        )
      );

      assert.equal(nonUpdatedItems.length, 0);
    });

    it("updateAllItems with server provided", async function () {
      const oldTimes = await PhantaItem.find().then((items) =>
        items.map((item) => item.marketInfo[TEST_SERVER_NAME].updatedAt)
      );

      await PhantasmagoriaHelpers.updateAllItems(TEST_SERVER_NAME);

      const nonUpdatedItems = await PhantaItem.find().then((items) =>
        items.filter(
          (item, index) =>
            item.marketInfo[TEST_SERVER_NAME].updatedAt < oldTimes[index]
        )
      );

      assert.equal(nonUpdatedItems.length, 0);
    });
  });
});

describe("Gatherable Helpers", function () {
  const TEST_ITEM_NAME = "Imperial Fern";
  let gatherableMats;

  before(async () => {
    GatherableItem.find().deleteMany();
    return await Promise.all([
      mongoose
        .connect(uri, {
          useNewUrlParser: true,
          useCreateIndex: true,
          useUnifiedTopology: true,
        })
        .then(() => console.log("Connected to MongoDB Atlas"))
        .catch((err) => {
          console.log("Failed to connect to MongoDB Atlas: " + err);
          throw err;
        }),
      (gatherableMats = await fs
        .readFile(GATHERABLE_ITEMS_JSON_PATH, "utf8")
        .then((json) => JSON.parse(json))),
    ]);
  });

  describe("addAllItems", function () {
    it("addAllItems should add all items in the json to the db", async function () {
      //Empty the items collection
      await GatherableItem.deleteMany({});
      const items = await GatherableItem.find();
      assert.equal(items.length, 0);

      await GatherableHelpers.addAllItems();
      const presentItems = await GatherableItem.find();
      const missingItems = Object.keys(gatherableMats).filter((requiredItem) =>
        presentItems.includes(requiredItem)
      );
      assert.equal(missingItems.length, 0);
    });
  });

  describe("getItems", function () {
    it("getItems should only return up to date items", async function () {
      const items = await GatherableHelpers.getItems();
      const outOfDateItems = items.filter((item) => {
        const itemTime = new Date(item.marketInfo[DEFAULT_SERVER].updatedAt);
        return Date.now() > itemTime.getTime() + ITEM_TTL * 1000;
      });
      assert.equal(outOfDateItems.length, 0);
    });

    it("getItems should return all items in the items collection", async function () {
      return Promise.all([
        GatherableHelpers.getItems().then((items) =>
          items.map((item) => item.name)
        ),
        GatherableItem.find().then((items) => items.map((item) => item.name)),
      ])
        .then((results) => {
          return results[1].filter((item) => !results[0].includes(item));
        })
        .then((itemsInJsonButNotInCollection) =>
          assert.equal(itemsInJsonButNotInCollection.length, 0)
        );
    });
  });

  describe("addItem", async function () {
    before(async () => await GatherableItem.deleteMany({}));

    it("addItem should add a supplied item that doesn't exist to the collection", async function () {
      assert.equal(
        await GatherableHelpers.addItem(
          TEST_ITEM_NAME,
          gatherableMats[TEST_ITEM_NAME]
        ),
        2
      );
      const savedItems = await GatherableItem.find({
        name: TEST_ITEM_NAME,
      }).catch(() =>
        assert.fail("More than one item with the same name found")
      );
      if (savedItems.length != 1) {
        assert.fail("More than one item with the same name found");
      }
      const savedItem = savedItems[0];
      assert.equal(savedItem.name, TEST_ITEM_NAME);
      assert.notEqual(savedItem.marketInfo[DEFAULT_SERVER], undefined);
      assert.notEqual(savedItem.marketInfo[DEFAULT_SERVER].price, undefined);
      assert.notEqual(
        savedItem.marketInfo[DEFAULT_SERVER].updatedAt,
        undefined
      );
    });

    it("addItem add the price for a new server for an item that already exists in the collection", async function () {
      assert.equal(
        await GatherableHelpers.addItem(
          TEST_ITEM_NAME,
          gatherableMats[TEST_ITEM_NAME],
          TEST_SERVER_NAME
        ),
        1
      );
      const savedItems = await GatherableItem.find({
        name: TEST_ITEM_NAME,
      }).catch(() =>
        assert.fail("More than one item with the same name found")
      );
      if (savedItems.length != 1) {
        assert.fail("More than one item with the same name found");
      }
      const savedItem = savedItems[0];
      assert.equal(savedItem.name, TEST_ITEM_NAME);
      assert.notEqual(savedItem.marketInfo[TEST_SERVER_NAME], undefined);
      assert.notEqual(savedItem.marketInfo[TEST_SERVER_NAME].price, undefined);
      assert.notEqual(
        savedItem.marketInfo[TEST_SERVER_NAME].updatedAt,
        undefined
      );
    });

    it("addItem should return 0 if one attempts to add an item that already exists to the collection", async function () {
      assert.equal(
        await GatherableItem.find({ name: TEST_ITEM_NAME }).then((items) => {
          return items.length;
        }),
        1
      );
      assert.equal(
        await GatherableHelpers.addItem(
          TEST_ITEM_NAME,
          gatherableMats[TEST_ITEM_NAME]
        ),
        0
      );
    });
  });

  describe("updateItem", function () {
    it("updateItem should update an Item", async function () {
      let oldDate = null;

      //Get the date of the item, ITEM_NAME, as it is currently saved and then call updateItem on it
      await GatherableItem.find({ name: TEST_ITEM_NAME })
        .then((items) => {
          if (items.length !== 1) {
            throw new Error("Items.length should have been 1");
          }
          return items[0];
        })
        .then((item) => {
          oldDate = item.marketInfo[DEFAULT_SERVER].updatedAt;
          return item;
        })
        .then((item) => GatherableHelpers.updateItem(item));

      //Check that the item was updated
      const items = await GatherableItem.find({ name: TEST_ITEM_NAME });
      if (items.length !== 1) {
        throw new Error(
          `Items.length should have been 1. Was actually ${items.length}`
        );
      }
      const item = items[0];
      assert.notEqual(item.updatedAt, oldDate);
    });

    it("updateItem with string instead of document", async function () {
      return GatherableHelpers.updateItem("Gobbledeegoop")
        .then(() =>
          assert.fail(
            "updateItem with string instead of document did not throw an error"
          )
        )
        .catch((err) => assert.instanceOf(err, TypeError));
    });

    it("updateItem with unsaved document", async function () {
      return GatherableHelpers.updateItem(new PhantaItem({}))
        .then(() =>
          assert.fail("updateItem with unsaved document did not throw an error")
        )
        .catch((err) => assert.instanceOf(err, InvalidArgumentError));
    });
  });

  describe("updateAllItems", function () {
    it("updateAllItems updates all items in the collection", async function () {
      const oldTimes = await GatherableItem.find().then((items) =>
        items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
      );

      await GatherableHelpers.updateAllItems();

      const nonUpdatedItems = await GatherableItem.find().then((items) =>
        items.filter(
          (item, index) =>
            item.marketInfo[DEFAULT_SERVER].updatedAt < oldTimes[index]
        )
      );

      assert.equal(nonUpdatedItems.length, 0);
    });

    it("updateAllItems with server provided", async function () {
      const oldTimes = await GatherableItem.find().then((items) =>
        items.map((item) => item.marketInfo[TEST_SERVER_NAME].updatedAt)
      );

      await GatherableHelpers.updateAllItems(TEST_SERVER_NAME);

      const nonUpdatedItems = await GatherableItem.find().then((items) =>
        items.filter(
          (item, index) =>
            item.marketInfo[TEST_SERVER_NAME].updatedAt < oldTimes[index]
        )
      );

      assert.equal(nonUpdatedItems.length, 0);
    });
  });
});
