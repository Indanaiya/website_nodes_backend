const assert = require("chai").assert;
const ItemsHelpers = require("../src/itemsHelpers");
const { PHANTASMAGORIA_MATS_JSON_PATH, ITEM_TTL } = require("../src/constants");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const Item = require("../models/Item.model");
const { InvalidArgumentError } = require("../src/errors");

require("dotenv").config();

const uri = process.env.ATLAS_URI;
let phantaJson = null;
const TEST_ITEM_NAME = "Tempest Adhesive";
const TEST_SERVER_NAME = "Cerberus";

//TODO Add a test to make sure that items aren't updated if they don't need to be
describe("Items Helpers", function () {
  before(() =>
    Promise.all([
      mongoose.connect(uri, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
      }),
      (phantaJson = fs.readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")),
    ])
  );
  describe("getItems", function () {
    it("getItems should only return up to date items", async function () {
      const items = await ItemsHelpers.getItems();
      const outOfDateItems = items.filter((item) => {
        const itemTime = new Date(item.updatedAt);
        return Date.now() > itemTime.getTime() + ITEM_TTL * 1000;
      });
      return assert.equal(outOfDateItems.length, 0);
    });

    it("getItems should return all items in the items collection", async function () {
      return Promise.all([
        ItemsHelpers.getItems().then((items) => items.map((item) => item.name)),
        Item.find().then((items) => items.map((item) => item.name)),
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
    before(async () => await Item.deleteMany({}));

    it("addItem should throw an error when given an invalid itemName", async function () {
      return ItemsHelpers.addItem("Gobbledeegook")
        .then(() =>
          assert.fail("addItem with invalid itemName did not throw an error")
        )
        .catch((err) => assert.instanceOf(err, InvalidArgumentError));
    });

    it("addItem should add an item to the collection", async function () {
      assert.equal(await ItemsHelpers.addItem(TEST_ITEM_NAME), 1);
      const savedItems = await Item.find({ name: TEST_ITEM_NAME }).catch(() =>
        assert.fail("More than one item with the same name found")
      );
      if (savedItems.length != 1) {
        assert.fail("More than one item with the same name found");
      }
      const savedItemName = savedItems[0].name;
      assert.equal(savedItemName, TEST_ITEM_NAME);
    });

    it("addItem should return 0 if one attempts to add an item that already exists to the collection", async function () {
      assert.equal(await ItemsHelpers.addItem(TEST_ITEM_NAME), 0);
    });
  });

  describe("updateItem", function () {
    it("updateItem should update an Item", async function () {
      let oldDate = null;

      //Get the date of the item, ITEM_NAME, as it is currently saved and then call updateItem on it
      await Item.find({ name: TEST_ITEM_NAME })
        .then((items) => {
          if (items.length !== 1) {
            throw new Error("Items.length should have been 1");
          }
          return items[0];
        })
        .then((item) => {
          oldDate = item.servers[`${TEST_SERVER_NAME}Price`].updatedAt;
          return item;
        })
        .then((item) => ItemsHelpers.updateItem(item));

      //Check that the item was updated
      const items = await Item.find({ name: TEST_ITEM_NAME });
      if (items.length !== 1) {
        throw new Error(
          `Items.length should have been 1. Was actually ${items.length}`
        );
      }
      const item = items[0];
      return assert.notEqual(item.updatedAt, oldDate);
    });

    it("updateItem with string instead of document", async function () {
      return ItemsHelpers.updateItem("Gobbledeegoop")
        .then(() =>
          assert.fail(
            "updateItem with string instead of document did not throw an error"
          )
        )
        .catch((err) => assert.instanceOf(err, TypeError));
    });

    it("updateItem with unsaved document", async function () {
      return ItemsHelpers.updateItem(new Item({}))
        .then(() =>
          assert.fail("updateItem with unsaved document did not throw an error")
        )
        .catch((err) => assert.instanceOf(err, InvalidArgumentError));
    });
  });

  describe("addAllItems", function () {
    it("addAllItems should add all items in the json to the db", async function () {
      //Empty the items collection
      await Item.deleteMany({});
      const items = await Item.find();
      assert.equal(items.length, 0);

      await ItemsHelpers.addAllItems();
      const presentItems = await Item.find();
      const missingItems = Object.keys(phantaJson).filter((requiredItem) =>
        presentItems.includes(requiredItem)
      );
      return assert.equal(missingItems.length, 0);
    });
  });

  describe("updateAllItems", function () {
    it("updateAllItems updates all items in the collection", async function () {
      const oldTimes = await Item.find().then((items) =>
        items.map((item) => item.servers[`${TEST_SERVER_NAME}Price`].updatedAt)
      );

      await ItemsHelpers.updateAllItems();

      const nonUpdatedItems = await Item.find().then((items) =>
        items.filter(
          (item, index) =>
            item.servers[`${TEST_SERVER_NAME}Price`].updatedAt < oldTimes[index]
        )
      );

      return assert.equal(nonUpdatedItems.length, 0);
    });

    it("updateAllItems with server provided", async function () {
      const oldTimes = await Item.find().then((items) =>
        items.map((item) => item.servers[`${TEST_SERVER_NAME}Price`].updatedAt)
      );

      await ItemsHelpers.updateAllItems(TEST_SERVER_NAME);

      const nonUpdatedItems = await Item.find().then((items) =>
        items.filter(
          (item, index) =>
            item.servers[`${TEST_SERVER_NAME}Price`].updatedAt < oldTimes[index]
        )
      );

      return assert.equal(nonUpdatedItems.length, 0);
    });
  });
});