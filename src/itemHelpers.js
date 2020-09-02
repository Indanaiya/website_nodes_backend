const { PhantaItem, GatherableItem } = require("../models/Item.model");
const { Document } = require("mongoose");
const fs = require("fs").promises;

const {
  DEFAULT_SERVER,
  ITEM_TTL,
} = require("../src/constants");
const fetchFromUniversalis = require("../src/fetchFromUniversalis");
const { InvalidArgumentError, DBError } = require("../src/errors");

/** CREATE */
/**
 * Add all items in the json to the model's collection
 * @param {string} itemsJsonPath The path to the JSON file containing informaiton about the items to add
 * @param {Model} model The model for the items to be saved as
 * @param {Function} addItem A function to save the items
 */
async function addAllItemsGeneric(itemsJsonPath, model, addFunction) {
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

  return Promise.allSettled(
    nonPresentItemNames.map((itemName) =>
      addFunction(itemName, requiredItems[itemName])
    )
  );
}

/**
 * Add a single item to the model's collection
 *
 * @param {Model} model The model for the item to be saved as
 * @param {Function} addFunction A function to save the items (For things unique to this type of item, e.g. phantasmagoria price)
 * @param {string} itemName The name of the item to be saved
 * @param {*} itemDetails An object representing the item
 * @param {string} server The server for market information to be fetched for
 */
async function addItemGeneric(
  model,
  addFunction,
  itemName,
  itemDetails,
  server = DEFAULT_SERVER
) {
  let savedItemsWithItemName;
  try {
    savedItemsWithItemName = await model.find({ name: itemName });
  } catch (err) {
    throw new DBError(
      `Error adding ${itemName} while trying to access DB: ${err}`
    );
  }
  if (savedItemsWithItemName.length > 1) {
    throw new DBError(
      `Too many items. Searching for ${itemName} returned ${savedItemsWithItemName.length} results.`
    );
  }

  //Information requested already exists in collection?:
  if (
    savedItemsWithItemName.length === 1 &&
    savedItemsWithItemName[0].marketInfo[server]?.price !== undefined
  ) {
    return 0;
  }

  const universalisObj = await fetchFromUniversalis(itemDetails.id);

  const marketInfo = {
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
    updatedAt: Date.now().toString(),
  };

  //Save price
  if (savedItemsWithItemName.length === 1) {
    const item = savedItemsWithItemName[0];
    item.marketInfo[server] = marketInfo;

    return item.save().then(() => 1);
  } else {
    const item = new model({
      name: itemName,
      marketInfo: { [server]: marketInfo },
      id: itemDetails.id,
      ...addFunction(itemDetails, universalisObj),
    });

    return item.save().then(() => 2);
  }
}

/** READ */
/**
 * Get all items in a collection
 * @param {Model} model The model for the collection to get items for
 * @param {string} fieldsToGet Which fields from the documents to return, as a space seperated string
 * @param  {...string} servers The servers to retrieve market information from (will update the prices if they are outdated)
 */
async function getItemsGeneric(model, fieldsToGet, ...servers) {
  //Update the out of date items
  const outOfDatePrices = await model.find().then((items) =>
    items.map((item) => {
      const outOfDateServers = { item, servers: [] };
      servers.forEach((server) => {
        if (
          item.marketInfo[server]?.updatedAt === undefined ||
          new Date(item.marketInfo[server].updatedAt).getTime() +
            ITEM_TTL * 1000 <
            Date.now()
        ) {
          const undef = item.marketInfo[server]?.updatedAt === undefined;
          const ood =
            new Date(item.marketInfo[server]?.updatedAt).getTime() +
              ITEM_TTL * 1000 <
            Date.now();
          console.log(
            `Updating ${item.name} on server ${server}, out of date\n Undefined?: ${undef}\n Out of date?: ${ood}`
          );
          outOfDateServers.servers.push(server);
        }
      });
      return outOfDateServers;
    })
  );

  await Promise.all(
    outOfDatePrices.map((item) =>
      item.servers.length > 0 ? updateItem(item.item, ...item.servers) : null
    )
  );

  //Return the items
  const projection =
    servers.map((server) => `marketInfo.${server}`).join(" ") +
    " name " +
    fieldsToGet;

  return model.find({}, projection);
}

/** UPDATE */
/**
 * Update the market information for an item for the given server(s)
 *
 * @param {Document} item The item to update
 * @param  {...string} servers The servers to update market information for
 */
async function updateItem(item, ...servers) {
  if (!(item instanceof Document)) {
    console.log(item);
    throw new TypeError(`'item' must be a document, it was: `, item);
  }
  if (item.isNew) {
    throw new InvalidArgumentError("'item' is new:", item);
  }
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  await Promise.all(
    servers.map((server) => {
      return fetchFromUniversalis(item.id, server).then(
        (universalisObj) => {
          item.marketInfo[server] = {
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
            updatedAt: Date.now().toString(),
          };
        }
      );
    })
  );

  return item.save().then(() => item);
}

/**
 * Update the market information for the given servers for all items in a collection
 * @param {Model} model The model for the collection to be updated
 * @param  {...string} servers The servers for which market information should be updated
 */
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
  addAllItems: async function (phantaMatsJsonPath) {
    return addAllItemsGeneric(
      phantaMatsJsonPath,
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
        return {
          task: itemDetails.task,
        };
      },
      itemName,
      itemDetails,
      server
    );
  },
  addAllItems: async function (gatherableItemsJsonPath) {
    return addAllItemsGeneric(
      gatherableItemsJsonPath,
      GatherableItem,
      this.addItem
    );
  },
  getItems: async function (...servers) {
    return getItemsGeneric(GatherableItem, "task", ...servers);
  },
  updateItem,
  updateAllItems: async function (...servers) {
    return updateAllItemsGeneric(GatherableItem, ...servers);
  },
};

module.exports = { phantasmagoria, gatherable };
