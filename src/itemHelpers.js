const { PhantaItem, GatherableItem } = require("../models/Item.model");
const fs = require("fs").promises;

const { DEFAULT_SERVER, ITEM_TTL, SERVERS } = require("../src/constants");
const fetchFromUniversalis = require("../src/fetchFromUniversalis");
const { InvalidArgumentError, DBError } = require("../src/errors");

class ItemHelpers {
  constructor(model, addFunction, projection) {
    this.addAllItems = this.addAllItems.bind(this, model, addFunction);
    this.addItem = this.addItem.bind(this, model, addFunction);
    this.getItems = this.getItems.bind(this, model, projection);
    this.updateItem = this.updateItem.bind(this);
    this.updateAllItems = this.updateAllItems.bind(this, model);
  }
  /** CREATE */
  /**
   * Add all items in the json to the model's collection
   * @param {string} itemsJsonPath The path to the JSON file containing informaiton about the items to add
   * @param {Model} model The model for the items to be saved as
   * @param {Function} addItem A function to save the items
   */
  async addAllItems(model, addFunction, itemsJsonPath) {
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
        this.addItem(itemName, requiredItems[itemName])
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
  async addItem(
    model,
    addFunction,
    itemName,
    itemDetails,
    server = DEFAULT_SERVER
  ) {
    if (
      model === undefined ||
      addFunction === undefined ||
      itemName === undefined ||
      itemDetails === undefined
    ) {
      throw new InvalidArgumentError("Cannot have an undefined argument", {
        model,
        addFunction,
        itemName,
        itemDetails,
      });
    }
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

    const universalisObj = await fetchFromUniversalis(itemDetails.id, server);

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
  async getItems(model, fieldsToGet, ...servers) {
    servers.forEach((server) => {
      if (!SERVERS.includes(server)) {
        throw new InvalidArgumentError(`${server} is not a valid server name`);
      }
    });
    if (servers.length === 0) {
      servers = [DEFAULT_SERVER];
    }
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
        item.servers.length > 0
          ? this.updateItem(item.item, ...item.servers)
          : null
      )
    );

    //Return the items
    const projection =
      servers.map((server) => `marketInfo.${server}`).join(" ") +
      " name id " +
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
  async updateItem(item, ...servers) {
    if(item === undefined){
      throw new InvalidArgumentError("Item must be defined")
    }
    if (!(item instanceof PhantaItem)) {
      throw new TypeError(`'item' must be a document, it was: `, item);
    }
    if (item.isNew) {
      throw new InvalidArgumentError("'item' is new:", item);
    }
    servers.forEach((server) => {
      if (!SERVERS.includes(server)) {
        throw new InvalidArgumentError(
          `Server ${server} is not a valid server name`
        );
      }
    });
    if (servers.length === 0) {
      servers = [DEFAULT_SERVER];
    }

    await Promise.all(
      servers.map((server) => {
        return fetchFromUniversalis(item.id, server).then((universalisObj) => {
          item.marketInfo[server] = {
            price: universalisObj.listings[0]?.pricePerUnit ?? null,
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
        });
      })
    );
    return item.save().then(() => item);
  }

  /**
   * Update the market information for the given servers for all items in a collection
   * @param {Model} model The model for the collection to be updated
   * @param  {...string} servers The servers for which market information should be updated
   */
  async updateAllItems(model, ...servers) {
    if (servers.length === 0) {
      servers = [DEFAULT_SERVER];
    }

    return model
      .find()
      .then((items) =>
        Promise.all(items.map((item) => this.updateItem(item, servers)))
      );
  }
}

const gatherable = new ItemHelpers(
  GatherableItem,
  (itemDetails) => {
    return {
      task: itemDetails.task,
    };
  },
  "task"
);

const phantasmagoria = new ItemHelpers(
  PhantaItem,
  (itemDetails) => {
    return {
      tomestonePrice: itemDetails.tomestonePrice,
    };
  },
  "tomestonePrice"
);

module.exports = { phantasmagoria, gatherable };
