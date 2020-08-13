const Item = require("../models/Item.model");
const {
  UNIVERSALIS_URL,
  PHANTASMAGORIA_MATS_JSON_PATH,
  DEFAULT_SERVER,
  ITEM_TTL,
} = require("../src/constants");
const Document = require("mongoose").Document;
const fetch = require("node-fetch");
const fs = require("fs").promises;
const { InvalidArgumentError } = require("../src/errors");

/**
 * Get the saved items from the collection, updating them first if they are out of date.
 * @param  {...string} servers Nothing yet TODO
 * @returns {Promise<Document[]>} A promise for an array of all the documents in the items collection
 */
//TODO Servers does nothing. Update time is per item and not per server.
async function getItems(...servers) {
  return Item.find()
    .then((items) =>
      items.filter((item) => {
        const itemTime = new Date(item.updatedAt);
        return Date.now() > itemTime.getTime() + ITEM_TTL * 1000;
      })
    )
    .then((outOfDateItems) =>
      Promise.all(outOfDateItems.map((item) => updateItem(item))).then(() =>
        Item.find()
      )
    );
}

/**
 * Add an item to the database.
 * Does nothing if an item with that name already exists in the database.
 *
 * @param {string} itemName The name of the item to add to the database
 * @param {string} server The server to add the price for TODO should be spread syntax
 * @returns {Promise<number>} A promise, the value is a number. 0 means an item with this name already exists in the collection, 1 means that the item was sucessfully saved to the collection
 */
async function addItem(itemName, server = DEFAULT_SERVER) {
  //Check that this is a valid itemName
  const items = await fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data));
  if (!Object.keys(items).includes(itemName)) {
    throw new InvalidArgumentError("Invalid itemName.");
  }

  //Check to see if an item with name: itemName is already in the collection
  const savedItemsWithItemName = await Item.find({ name: itemName });
  if (savedItemsWithItemName.length > 0) {
    return 0;
  }

  //Create a new item corresponding to itemName and save it to the collection
  const item = await fetch(
    `${UNIVERSALIS_URL + server}/${items[itemName].universalisId}`
  )
    .then((response) => response.text())
    .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"])
    .then(
      (price) =>
        new Item({
          name: itemName,
          servers: {
            [`${server}Price`]: { price, updatedAt: Date.now().toString() },
          },
          universalisId: items[itemName].universalisId,
        })
    );
  return item.save().then(() => 1);
}

/**
 * Ensure that all the items in PHANTASMAGORIA_MATS_JSON are in the items collection
 *
 * @returns {Promise} An awaited promise that runs the function code. You may wish to add a catch after it.
 */
async function addAllItems() {
  const requiredItemNames = await fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data))
    .then((json) => Object.keys(json));

  const presentItemNames = await Item.find().then((items) =>
    items.map((item) => item.name)
  );

  const nonPresentItemNames = requiredItemNames.filter((itemName) => {
    console.log(
      `Is ${itemName} in presentItemNames?: ${presentItemNames.includes(
        itemName
      )}`
    );
    return !presentItemNames.includes(itemName);
  });

  return Promise.all(
    nonPresentItemNames.map((itemName) =>
      addItem(itemName).then((response) => console.log(response))
    )
  );
}

/**
 * Update the database entry for a given item
 *
 * @param {Document} item The item to update
 * @param {...string} servers All the servers to update the item's price for
 * @returns {Promise<any[]>} a promise that runs the function code and returns the saved item
 */
async function updateItem(item, ...servers) {
  if (!(item instanceof Document)) {
    throw new TypeError("'item' must be a document.");
  }
  if (item.isNew) {
    throw new InvalidArgumentError("'item' is new.");
  }
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return Promise.all(
    servers.map((server) =>
      fetch(`${UNIVERSALIS_URL + server}/${item.universalisId}`)
        .then((response) => response.text())
        .then((body) => {
          item.updatedAt = Date.now().toString();
          item.servers[`${server}Price`] = {
            price: JSON.parse(body)["listings"][0]["pricePerUnit"],
            updatedAt: Date.now().toString(),
          };
          console.log(
            `Updated ${item.name}'s ${server}Price to: ` +
              item.servers[`${server}Price`]
          );
          return item.save().then(() => item);
        })
    )
  );
}

/**
 * Update all of the items in the items collection for the given server
 *
 * @param {...string} servers All the servers to update items' prices
 * @returns {Promise<any[]>} A promise that runs the function code.
 */
async function updateAllItems(...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return Item.find().then((items) =>
    Promise.all(items.map((item) => updateItem(item, servers)))
  );
}

const functionsBundle = {
  updateItem,
  updateAllItems,
  addItem,
  addAllItems,
  getItems,
};

module.exports = functionsBundle;
