const assert = require("chai").assert;
const ItemsHelpers = require("../src/itemsHelpers");
const { PHANTASMAGORIA_MATS_JSON_PATH, ITEM_TTL } = require("../src/constants");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const Item = require("../models/Item.model");
const { promises } = require("fs");

require("dotenv").config();

const uri = process.env.ATLAS_URI;
let phantajson = null;

describe("Items Helpers", function (done) {
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
      ItemsHelpers.getItems().then((items) =>
        items.map((item) => item.name)
      ),
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
