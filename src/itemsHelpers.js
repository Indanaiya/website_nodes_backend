const Item = require("../models/Item.model");
const {
  UNIVERSALIS_URL,
  PHANTASMAGORIA_MATS_JSON_PATH,
  DEFAULT_SERVER,
  ITEM_TTL,
} = require("../src/constants");
const fetch = require("node-fetch");
const fs = require("fs").promises;

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
        return Date.now() < itemTime.getTime() + ITEM_TTL * 1000;
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
 * @returns {Promise<string>} A promise, the value of which will be a string indicating success or failure.
 */
async function addItem(itemName, server = DEFAULT_SERVER) {
  let items;
  return fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => {
      //console.log(data);
      items = JSON.parse(data);
      if (!Object.keys(items).includes(itemName)) {
        return `Invalid item name: ${itemName}`; //TODO this should probably be an error
      }
      return Item.find({ name: itemName });
    })
    .then((savedItems) => {
      //console.log(savedItems);
      if (savedItems.length > 0) {
        return `Item "${itemName}" already exists in database.`;
      } else {
        return fetch(
          `${UNIVERSALIS_URL + server}/${items[itemName].universalisId}`
        )
          .then((response) => response.text())
          .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"])
          .then((price) => {
            const item = new Item({
              name: itemName,
              servers: { CerberusPrice: price },
              universalisId: items[itemName].universalisId,
            });
            return item
              .save()
              .then(() => `Item "${itemName}" saved.`)
              .catch((err) => `Could not save "${itemName}": ${err}`);
          });
      }
    });
}

/**
 * Ensure that all the items in PHANTASMAGORIA_MATS_JSON are in the items collection
 *
 * @returns {Promise} An awaited promise that runs the function code. You may wish to add a catch after it.
 */
async function addAllItems() {
  const requiredItemNames = [];
  const presentItemNames = [];
  return await fs //TODO using the await here rather than when the function is called may be wrong
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data))
    .then((json) => {
      for (let itemName of Object.keys(json)) {
        requiredItemNames.push(itemName);
      }
      //console.log(`Required Items: ${requiredItemNames}`);
    })
    .then(() => Item.find())
    .then((items) => {
      for (let item of items) {
        presentItemNames.push(item.name);
      }
      //console.log(`Present items: ${presentItemNames}`);
    })
    .then(() => {
      const nonPresentItemNames = requiredItemNames.filter((itemName) => {
        console.log(
          `Is ${itemName} in presentItemNames?: ${presentItemNames.includes(
            itemName
          )}`
        );
        return !presentItemNames.includes(itemName);
      });
      //console.log(`Non-present items: ${nonPresentItemNames}`);

      for (let itemName of nonPresentItemNames) {
        //console.log(`Adding item: ${itemName}`);
        addItem(itemName).then((response) => console.log(response));
      }
    });
}

/**
 * Update the database entry for a given item
 *
 * @param {Document} item The item to update
 * @param {...string} servers All the servers to update the item's price for
 * @returns {Promise} a promise that runs the function code
 */
async function updateItem(item, ...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return Promise.all(
    servers.map((server) =>
      fetch(`${UNIVERSALIS_URL + server}/${item.universalisId}`)
        .then((response) => response.text())
        .then((body) => {
          item.updatedAt = Date.now().toString();
          console.log(item.updatedAt);
          item.price = JSON.parse(body)["listings"][0]["pricePerUnit"];
          return item.save().then(() => item);
        })
    )
  );
}

/**
 * Update all of the items in the items collection for the given server
 *
 * @param {...string} servers All the servers to update items' prices
 * @returns {Promise<Promise<any>[]>} A promise that runs the function code.
 */
async function updateAllItems(...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return Item.find().then((items) =>
    items.map((item) => updateItem(item, servers))
  );
}

const functionsBundle = { updateItem, updateAllItems, addItem, addAllItems, getItems };

module.exports = functionsBundle;
