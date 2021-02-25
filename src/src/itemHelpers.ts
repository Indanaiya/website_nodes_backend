import {
  IProtoItem,
  PhantaItem,
  GatherableItem,
  AethersandItem,
  IProtoItemBaseDocument,
  IPhantaItemBaseDocument,
  IAethersandItem,
  IPhantaItem,
  IGatherableItem,
} from "../models/Item.model.js";
import { Model } from "mongoose";
import { promises as fs } from "fs";

import { DEFAULT_SERVER, ITEM_TTL, SERVERS } from "../src/constants.js";
import fetchFromUniversalis from "../src/fetchFromUniversalis.js";
import { InvalidArgumentError, DBError } from "../src/errors.js";

/**
 * A class to assist with interacting with the database for Items
 */
 export class ItemHelpers<DocType extends IProtoItemBaseDocument, ItemType extends IProtoItem> {
  /** The model that this object is a helper for */
  model: Model<DocType, {}>;
  /** A function to add any unique properties to the document */
  addFunction: Function;
  /** A function to get any unique properties for the document */
  projection: string;

  constructor(
    model: Model<DocType, {}>,
    addFunction: Function = () => ({}),
    projection = ""
  ) {
    this.model = model;
    this.addFunction = addFunction;
    this.projection = projection;
  }

  /** CREATE */
  /**
   * Add all items in the json to the model's collection
   */
  async addAllItems(itemsJsonPath: string) {
    const requiredItems = await fs
      .readFile(itemsJsonPath, "utf8")
      .then((data) => JSON.parse(data));
    const requiredItemNames = Object.keys(requiredItems);

    const presentItemNames = await this.model
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
  // TODO what the heck do these return values mean
  async addItem(
    itemName: string,
    itemDetails: ItemType,
    server: string = DEFAULT_SERVER
  ) {
    if (itemName === undefined || itemDetails === undefined) {
      throw new InvalidArgumentError(
        `Cannot have an undefined argument. itemName: ${itemName}, itemDetails: ${itemDetails}`
      );
    }

    let savedItemsWithItemName;
    try {
      // There appears to be an issue with mongoose and generics not allowing me to use queries correctly so this is a workaround
      const model: any = this.model;
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

    const universalisObj = await fetchFromUniversalis(itemDetails.universalisId, server);
    const {
      listings: {
        0: { pricePerUnit },
      },
      regularSaleVelocity,
      nqSaleVelocity,
      hqSaleVelocity,
      averagePrice,
      averagePriceNQ,
      averagePriceHQ,
      lastUploadTime,
    } = universalisObj;

    const marketInfo = {
      price: pricePerUnit,
      saleVelocity: {
        overall: regularSaleVelocity,
        nq: nqSaleVelocity,
        hq: hqSaleVelocity,
      },
      avgPrice: {
        overall: averagePrice,
        nq: averagePriceNQ,
        hq: averagePriceHQ,
      },
      lastUploadTime: lastUploadTime,
      updatedAt: Date.now().toString(),
    };

    //Save price
    if (savedItemsWithItemName.length === 1) {
      const item = savedItemsWithItemName[0];
      item.marketInfo[server] = marketInfo;
      return item.save().then(() => 1);
    } else {
      const item = new this.model({
        name: itemName,
        marketInfo: { [server]: marketInfo },
        universalisId: itemDetails.universalisId,
        ...this.addFunction(itemDetails, universalisObj),
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
  async getItems(...servers: string[]) {
    servers.forEach((server) => {
      if (!SERVERS.includes(server)) {
        throw new InvalidArgumentError(`${server} is not a valid server name`);
      }
    });
    if (servers.length === 0) {
      servers = [DEFAULT_SERVER];
    }
    //Update the out of date items
    const outOfDatePrices = await this.model.find().then((items) =>
      items.map((item) => {
        const outOfDateServers: {
          item: DocType;
          servers: string[];
        } = { item, servers: [] };
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
      " name universalisId " +
      this.projection;

    return this.model.find({}, projection);
  }

  /** UPDATE */
  /**
   * Update the market information for an item for the given server(s)
   */
  async updateItem(item: DocType, ...servers: string[]) {
    if (item === undefined) {
      throw new InvalidArgumentError("Item must be defined");
    }
    if (item.isNew) {
      throw new InvalidArgumentError(`'item' is new: ${item}`);
    }
    servers.forEach((server) => {
      if (!SERVERS.includes(server)) {
        console.log(SERVERS.includes(server));
        console.log({ server });
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
        return fetchFromUniversalis(item.universalisId, server).then((universalisObj) => {
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
   * @param model The model for the collection to be updated
   * @param servers The servers for which market information should be updated
   */
  async updateAllItems(...servers: string[]) {
    if (servers.length === 0) {
      servers = [DEFAULT_SERVER];
    }

    return this.model
      .find()
      .then((items) =>
        Promise.all(items.map((item) => this.updateItem(item, ...servers)))
      );
  }
}

export const gatherableItemHelper = new ItemHelpers(
  GatherableItem,
  (itemDetails: IGatherableItem) => {
    return {
      task: itemDetails.task,
    };
  },
  "task"
);

export const aethersandItemHelper = new ItemHelpers(
  AethersandItem,
  (itemDetails: IAethersandItem) => {
    return {
      icon: itemDetails.icon,
    };
  },
  "icon"
);

export const phantasmagoriaItemHelper = new ItemHelpers<IPhantaItemBaseDocument, IPhantaItem>(
  PhantaItem,
  (itemDetails: IPhantaItem) => {
    return {
      tomestonePrice: itemDetails.tomestonePrice,
    };
  },
  "tomestonePrice"
);