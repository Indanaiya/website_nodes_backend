/* eslint-disable no-undef */
const assert = require("chai").assert;
const {
  phantasmagoria: PhantasmagoriaHelpers,
  gatherable: GatherableHelpers,
} = require("../src/itemHelpers");
const {
  ITEM_TTL,
  DEFAULT_SERVER,
} = require("../src/constants");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { PhantaItem, GatherableItem } = require("../models/Item.model");
const { InvalidArgumentError } = require("../src/errors");

const PHANTASMAGORIA_MATS_JSON_PATH = "res/test/phantasmagoriaMatsTest.json";
const GATHERABLE_ITEMS_JSON_PATH = "res/test/gatherableItemsTest.json";

require("dotenv").config();

const uri = process.env.ATLAS_URI;
const TEST_SERVER_NAME = "Moogle";

//TODO Add a test to make sure that items aren't updated if they don't need to be
function describeItemHelpers(model, testItemName, matsJsonPath, name, helpers) {
  describe(`${name} Helpers`, function () {
    let mats = null;

    before(async () => {
      model.find().deleteMany();
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
        (mats = await fs
          .readFile(matsJsonPath, "utf8")
          .then((json) => JSON.parse(json))),
      ]);
    });

    describe("addAllItems", function () {
      it("should add all items in the json to the db", async function () {
        //Empty the items collection
        await model.deleteMany({});
        const items = await model.find();
        assert.equal(items.length, 0); //Not really a part of the test

        await helpers.addAllItems(GATHERABLE_ITEMS_JSON_PATH);
        const presentItems = await model.find();
        const missingItems = Object.keys(mats).filter((requiredItem) =>
          presentItems.includes(requiredItem)
        );
        assert.equal(missingItems.length, 0);
      });
    });

    describe("getItems", function () {
      it("should only return up to date items", async function () {
        const items = await helpers.getItems();
        const outOfDateItems = items.filter((item) => {
          const itemTime = new Date(item.marketInfo[DEFAULT_SERVER].updatedAt);
          return Date.now() > itemTime.getTime() + ITEM_TTL * 1000;
        });
        assert.equal(outOfDateItems.length, 0);
      });

      it("should return all items in the items collection", async function () {
        return Promise.all([
          helpers.getItems().then((items) => items.map((item) => item.name)),
          model.find().then((items) => items.map((item) => item.name)),
        ])
          .then((results) => {
            return results[1].filter((item) => !results[0].includes(item));
          })
          .then((itemsInJsonButNotInCollection) =>
            assert.equal(itemsInJsonButNotInCollection.length, 0)
          );
      });

      it("should only update items if they need updating", async function () {
        //Items should all be up to date from previous tests
        const items = await model.find();
        const getItems = await helpers.getItems();
        const modelItemsObj = {};
        items.forEach(
          (item) =>
            (modelItemsObj[item.name] =
              item.marketInfo[DEFAULT_SERVER].updatedAt)
        );
        const updatedItems = getItems.filter(
          (item) =>
            item.marketInfo[DEFAULT_SERVER].updatedAt ===
            modelItemsObj[item.name]
        );
        assert.equal(updatedItems.length, 0);
      });
    });

    describe("addItem", async function () {
      before(async () => await model.deleteMany({}));

      it("should add a supplied item that doesn't exist to the collection", async function () {
        assert.equal(
          await helpers.addItem(testItemName, mats[testItemName]),
          2
        );
        const savedItems = await model
          .find({
            name: testItemName,
          })
          .catch(() =>
            assert.fail("More than one item with the same name found")
          );
        if (savedItems.length != 1) {
          assert.fail("More than one item with the same name found");
        }
        const savedItem = savedItems[0];
        assert.equal(savedItem.name, testItemName);
        assert.notEqual(savedItem.marketInfo[DEFAULT_SERVER], undefined);
        assert.notEqual(savedItem.marketInfo[DEFAULT_SERVER].price, undefined);
        assert.notEqual(
          savedItem.marketInfo[DEFAULT_SERVER].updatedAt,
          undefined
        );
      });

      it("should add the price for a new server for an item that already exists in the collection", async function () {
        assert.equal(
          await helpers.addItem(
            testItemName,
            mats[testItemName],
            TEST_SERVER_NAME
          ),
          1
        );
        const savedItems = await model
          .find({
            name: testItemName,
          })
          .catch(() =>
            assert.fail("More than one item with the same name found")
          );
        if (savedItems.length != 1) {
          assert.fail("More than one item with the same name found");
        }
        const savedItem = savedItems[0];
        assert.equal(savedItem.name, testItemName);
        assert.notEqual(savedItem.marketInfo[TEST_SERVER_NAME], undefined);
        assert.notEqual(
          savedItem.marketInfo[TEST_SERVER_NAME].price,
          undefined
        );
        assert.notEqual(
          savedItem.marketInfo[TEST_SERVER_NAME].updatedAt,
          undefined
        );
      });

      it("should return 0 if one attempts to add an item that already exists to the collection", async function () {
        assert.equal(
          await helpers.addItem(testItemName, mats[testItemName]),
          0
        );
      });
    });

    describe("updateItem", function () {
      it("should update an Item", async function () {
        let oldDate = null;

        //Get the date of the item, ITEM_NAME, as it is currently saved and then call updateItem on it
        await model
          .find({ name: testItemName })
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
          .then((item) => helpers.updateItem(item));

        //Check that the item was updated
        const items = await model.find({ name: testItemName });
        if (items.length !== 1) {
          throw new Error(
            `Items.length should have been 1. Was actually ${items.length}`
          );
        }
        const item = items[0];
        assert.notEqual(item.updatedAt, oldDate);
      });

      it("should fail when provided with an argument that isn't a document", async function () {
        return helpers
          .updateItem("Gobbledeegoop")
          .then(() =>
            assert.fail(
              "updateItem with string instead of document did not throw an error"
            )
          )
          .catch((err) => assert.instanceOf(err, TypeError));
      });

      it("should fail when provided with an unsaved document", async function () {
        return helpers
          .updateItem(new model({}))
          .then(() =>
            assert.fail(
              "updateItem with unsaved document did not throw an error"
            )
          )
          .catch((err) => assert.instanceOf(err, InvalidArgumentError));
      });
    });

    describe("updateAllItems", function () {
      it("should update all items in the collection", async function () {
        const oldTimes = await model
          .find()
          .then((items) =>
            items.map((item) => item.marketInfo[DEFAULT_SERVER].updatedAt)
          );

        await helpers.updateAllItems();

        const nonUpdatedItems = await model
          .find()
          .then((items) =>
            items.filter(
              (item, index) =>
                item.marketInfo[DEFAULT_SERVER].updatedAt < oldTimes[index]
            )
          );

        assert.equal(nonUpdatedItems.length, 0);
      });

      it("should update information for the server provided", async function () {
        const oldTimes = await model
          .find()
          .then((items) =>
            items.map((item) => item.marketInfo[TEST_SERVER_NAME].updatedAt)
          );

        await helpers.updateAllItems(TEST_SERVER_NAME);

        const nonUpdatedItems = await model
          .find()
          .then((items) =>
            items.filter(
              (item, index) =>
                item.marketInfo[TEST_SERVER_NAME].updatedAt < oldTimes[index]
            )
          );

        assert.equal(nonUpdatedItems.length, 0);
      });
    });
  });
}

describeItemHelpers(
  PhantaItem,
  "Multifaceted Alumen",
  PHANTASMAGORIA_MATS_JSON_PATH,
  "Phantasmagoria",
  PhantasmagoriaHelpers
);
describeItemHelpers(
  GatherableItem,
  "White Oak Branch",
  GATHERABLE_ITEMS_JSON_PATH,
  "Gatherable",
  GatherableHelpers
);
