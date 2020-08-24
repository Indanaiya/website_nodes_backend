const { PhantaItem, GatherableItem } = require("../models/Item.model");
const { Document } = require("mongoose");
const fetch = require("node-fetch");
const fs = require("fs").promises;

const {
  DEFAULT_SERVER,
  UNIVERSALIS_URL,
  PHANTASMAGORIA_MATS_JSON_PATH,
  GATHERABLE_ITEMS_JSON_PATH,
  ITEM_TTL,
} = require("../src/constants");
const { InvalidArgumentError } = require("../src/errors");

/** CREATE */

async function addAllItemsGeneric(itemsJsonPath, model, addItem) {
  const requiredItems = await fs
    .readFile(itemsJsonPath, "utf8")
    .then((data) => JSON.parse(data));
  const requiredItemNames = Object.keys(requiredItems);

  const presentItemNames = await model
    .find()
    .then((items) => items.map((item) => item.name));

  const nonPresentItemNames = requiredItemNames.filter(
    (itemName) => !presentItemNames.includes(itemName)
  );

  return Promise.all(
    nonPresentItemNames.map((itemName) =>
      addItem(itemName, requiredItems[itemName]).then((response) =>
        console.log(response)
      )
    )
  );
}

async function addItemGeneric(
  model,
  addFunction,
  itemName,
  itemDetails,
  server = DEFAULT_SERVER
) {
  const savedItemsWithItemName = await model.find({ name: itemName });
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
  const universalisObj = await fetch(
    `${UNIVERSALIS_URL + server}/${itemDetails.universalisId}`
  )
    .then((response) => response.text())
    .catch((err) =>
      console.log(
        `Error getting response from Universalis for item ${itemName}(id: ${itemDetails.universalisId}): ${err}`
      )
    )
    .then((body) => JSON.parse(body))
    .catch((err) =>
      console.log(
        `Error parsing json response from Universalis for item ${itemName}(id: ${itemDetails.universalisId}): ${err}`
      )
    );

  const price = universalisObj["listings"][0]["pricePerUnit"];
  console.log(`price for ${itemName}: ${price}`);

  //Save price
  if (savedItemsWithItemName.length === 1) {
    const item = savedItemsWithItemName[0];
    item.prices[server] = {
      price,
      updatedAt: Date.now().toString(),
    };

    return item.save().then(() => 1);
  } else {
    const item = new model({
      name: itemName,
      prices: {
        [server]: { price, updatedAt: Date.now().toString() },
      },
      universalisId: itemDetails.universalisId,
      ...addFunction(itemDetails, universalisObj),
    });

    return item.save().then(() => 2);
  }
}

/** READ */

async function getItemsGeneric(model, fieldsToGet, ...servers) {
  //Update the out of date items
  const outOfDatePrices = await model.find().then((items) =>
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
    servers.map((server) => `prices.${server}`).join(" ") +
    " name " +
    fieldsToGet;
  return model.find({}, projection);
}

/** UPDATE */

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

async function updateAllItemsGeneric(model, ...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return model
    .find()
    .then((items) =>
      Promise.all(items.map((item) => updateItem(item, servers)))
    );
}
//I could probably make a class for these two
const phantasmagoria = {
  addItem: async function (itemName, itemDetails, server) {
    return addItemGeneric(
      PhantaItem,
      (itemDetails) => {
        return {
          tomestonePrice: itemDetails.tomestonePrice,
        };
      },
      itemName,
      itemDetails,
      server
    );
  },
  addAllItems: async function () {
    return addAllItemsGeneric(
      PHANTASMAGORIA_MATS_JSON_PATH,
      PhantaItem,
      this.addItem
    );
  },
  getItems: async function (...servers) {
    return getItemsGeneric(PhantaItem, "tomestonePrice", ...servers);
  },
  updateItem,
  updateAllItems: async function (...servers) {
    return updateAllItemsGeneric(PhantaItem, ...servers);
  },
};

const gatherable = {
  addItem: async function (itemName, itemDetails, server) {
    return addItemGeneric(
      GatherableItem,
      (itemDetails) => {
        console.log(itemDetails);
        return {
          task: itemDetails.task,
        };
      },
      itemName,
      itemDetails,
      server
    );
  },
  addAllItems: async function () {
    return addAllItemsGeneric(
      GATHERABLE_ITEMS_JSON_PATH,
      GatherableItem,
      this.addItem
    );
  },
  getItems: async function (...servers) {
    return getItemsGeneric(
      GatherableItem,
      "task",
      ...servers
    );
  },
  updateItem,
  updateAllItems: async function (...servers) {
    return updateAllItemsGeneric(GatherableItem, ...servers);
  },
};

module.exports = { phantasmagoria, gatherable };
