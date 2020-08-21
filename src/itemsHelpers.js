const Item = require("../models/Item.model");
const {
  UNIVERSALIS_URL,
  PHANTASMAGORIA_MATS_JSON_PATH,
  DEFAULT_SERVER,
  ITEM_TTL,
} = require("../src/constants");
const {Document} = require("mongoose");
const fetch = require("node-fetch");
const fs = require("fs").promises;
const { InvalidArgumentError } = require("../src/errors");

/**
 * Get the price information for the specified item from the collection
 * @param {string} universalisId The id of the item
 * @param  {...string} servers The name of the server(s) or datacenter to get prices for
 */
async function getItem(universalisId, ...servers) {
  const projection = { name: 1 };
  for (let server of servers) {
    projection[`prices.${server}`] = 1;
  }
  console.log(projection);
  const response = await Item.findOne({ universalisId }, projection);

  Promise.all(
    servers
      .filter((server) => response.prices?.server === undefined)
      .map((server) => addItem(response.name, server))
  );

  for (let server of servers) {
    if (response.prices?.server === undefined) {
      addItem(response.name);
    }
  }
}

/**
 * Get the saved items from the collection, updating them first if they are out of date.
 * @param  {...string} servers Which server(s) to fetch the price(s) for.
 * @returns {Promise<Document[]>} A promise for an array of all the documents in the items collection
 */
async function getItems(...servers) {
  //Update the out of date items
  const outOfDatePrices = await Item.find().then((items) =>
    items.map((item) => {
      const outOfDateServers = { name: item, servers: [] };
      servers.forEach((server) => {
        if (
          item.prices[`server`]?.updatedAt === undefined ||
          new Date(item.prices[`server`].updatedAt).getTime() +
            ITEM_TTL * 1000 <
            Date.now()
        ) {
          outOfDateServers.servers.push(server);
        }
      });
      return outOfDateServers;
    })
  );
  await Promise.all(
    outOfDatePrices.map((item) => updateItem(item.name, ...item.servers))
  );

  //Return the items
  const projection =
    servers.map((server) => `prices.${server}`).join(" ") + " name tomestonePrice";
  return Item.find({}, projection);
}

/**
 * Add an item to the database.
 * If item exists, but doesn't have a price saved for the specified server, then the price for that server is added.
 * If the item exists and has a price saved for the specified server, then nothing happens
 *
 * @param {string} itemName The name of the item to add to the database
 * @param {string} server The server to add the price for TODO should be spread syntax
 * @returns {Promise<number>} A promise, the value is a number. 0 means an item with this name already exists in the collection and it has a price for the specified server, 1 means that the item existed but had the price for the specified server, 2 means that no changes were made
 */
async function addItem(itemName, server = DEFAULT_SERVER) {
  //Check that this is a valid itemName
  const items = await fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data));
  if (!Object.keys(items).includes(itemName)) {
    throw new InvalidArgumentError("Invalid itemName.");
  }

  const savedItemsWithItemName = await Item.find({ name: itemName });
  if (savedItemsWithItemName.length > 1) {
    throw new Error(
      `Too many items. Searching for ${itemName} returned ${savedItemsWithItemName.length} results.`
    );
  }

  //Information requested already exists in collection?:
  if (
    savedItemsWithItemName.length === 1 &&
    savedItemsWithItemName[0].prices[server].price !== undefined
  ) {
    return 0;
  }

  //Get price
  const price = await fetch(
    `${UNIVERSALIS_URL + server}/${items[itemName].universalisId}`
  )
    .then((response) => response.text())
    .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"]);

  //Save price
  if (savedItemsWithItemName.length === 1) {
    const item = savedItemsWithItemName[0];
    item.prices[server] = {
      price,
      updatedAt: Date.now().toString(),
    };

    return item.save().then(() => 1);
  } else {
    const item = new Item({
      name: itemName,
      tomestonePrice: items[itemName].tomestonePrice,
      prices: {
        [server]: { price, updatedAt: Date.now().toString() },
      },
      universalisId: items[itemName].universalisId,
    });

    return item.save().then(() => 2);
  }
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

  await Promise.all(
    servers.map((server) =>
      fetch(`${UNIVERSALIS_URL + server}/${item.universalisId}`)
        .then((response) => response.text())
        .then((body) => {
          item.prices[server] = {
            price: JSON.parse(body)["listings"][0]["pricePerUnit"],
            updatedAt: Date.now().toString(),
          };
        })
    )
  );

  return item.save().then(() => item);
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
  getItem,
};

module.exports = functionsBundle;
