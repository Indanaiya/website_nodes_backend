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
  ServerPrices,
} from "../models/Item.model.js";
import { Model } from "mongoose";
import { promises as fs } from "fs";

import { DEFAULT_SERVER, ITEM_TTL, SERVERS } from "../src/constants.js";
import fetchFromUniversalis from "../src/fetchFromUniversalis.js";
import { InvalidArgumentError, DBError } from "../src/errors.js";
import { validateServers } from "./validateServers.js";

/**
 * Get market information for the specified item and server
 *
 * @param universalisId The id of the item to retrieve market information for
 * @param server The server that the prices should be fetched for
 */
export async function getMarketInfo(
  universalisId: number,
  server: string
): Promise<ServerPrices> {
  const universalisObj = await fetchFromUniversalis(universalisId, server);

  //Destructuring the universalis object
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

  return {
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
}

export enum addItemReturn {
  ALREADY_PRESENT = 0,
  ADDED = 1,
}

/**
 * A class to assist with interacting with the database for Items
 */
export class ItemHelper<
  DocType extends IProtoItemBaseDocument,
  ItemType extends IProtoItem
> {
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
   * Add all items in a json file to the model's collection
   *
   * @param itemsJsonPath The location of a JSON file containing the information for the items to be added
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
        this.addItem(requiredItems[itemName])
      )
    );
  }

  /**
   * Add a single item to the model's collection
   *
   * @param itemDetails Information about the item to be added
   */
  async addItem(itemDetails: ItemType) {
    let savedItemsWithItemName: DocType[];
    try {
      // There appears to be an issue with mongoose and generics not allowing me to use queries correctly so this is a workaround
      const model: any = this.model;
      savedItemsWithItemName = await model.find({ name: itemDetails.name });
    } catch (err) {
      throw new DBError(
        `Error adding ${itemDetails.name} while trying to access DB: ${err}`
      );
    }
    if (savedItemsWithItemName.length > 1) {
      throw new DBError(
        `Too many items. Searching for ${itemDetails.name} returned ${savedItemsWithItemName.length} results.`
      );
    }

    if (savedItemsWithItemName.length === 1) {
      return addItemReturn.ALREADY_PRESENT;
    } else {
      const item = new this.model({
        name: itemDetails.name,
        universalisId: itemDetails.universalisId,
        ...this.addFunction(itemDetails),
      });
     // This can be removed for performance reasons but it's a handy thing to have in case something goes wrong

      const valid = item.validateSync();
      if (valid !== undefined) {
        console.log({ reason: valid, item, itemDetails });
      }
      return item.save().then(() => addItemReturn.ADDED);
    }
  }

  /** READ */
  /**
   * Get all of the documents for this item type
   *
   * @param servers The servers to retrieve market information from (will update the prices if they are outdated)
   */
  async getItems(...servers: string[]) {
    servers = validateServers(...servers);

    // Update the out of date items
    const items = await this.model.find();
    const outOfDatePrices = items.map((item) => {
      const outOfDateServers =
        item.marketInfo === undefined
          ? // There is no price information therefore we need price information for all servers
            servers
          : // Find which servers have out of date information and return only those
            servers.filter((server) => {
              if (
                item.marketInfo![server]?.updatedAt === undefined ||
                new Date(item.marketInfo![server].updatedAt).getTime() +
                  ITEM_TTL * 1000 <
                  Date.now()
              ) {
                // Everything here except return true is just for console readouts
                const undef = item.marketInfo![server]?.updatedAt === undefined;
                const outOfDate =
                  new Date(item.marketInfo![server]?.updatedAt).getTime() +
                    ITEM_TTL * 1000 <
                  Date.now();
                console.log(
                  `Updating ${item.name} on server ${server}, out of date\n Undefined?: ${undef}\n Out of date?: ${outOfDate}`
                );

                return true;
              } else {
                return false;
              }
            });
      // The servers that this item has out of date price information for
      return {
        item,
        servers: outOfDateServers,
      };
    });

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
   *
   * @param item The item to update market information for
   * @param servers The servers that the item should have updated market information for
   */
  async updateItem(item: DocType, ...servers: string[]) {
    // Parameter validation
    if (item.isNew) {
      throw new InvalidArgumentError(`'item' is new: ${item}`);
    }
    servers = validateServers(...servers);

    if (item.marketInfo === undefined) {
      item.marketInfo = {};
    }

    await Promise.all(
      servers.map((server) => {
        return fetchFromUniversalis(item.universalisId, server).then(
          (universalisObj) => {
            item.marketInfo![server] = {
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
          }
        );
      })
    );
    return item.save().then(() => item);
  }

  /**
   * Update the market information for the given servers for all items in a collection
   *
   * @param servers The servers for which market information should be updated
   */
  async updateAllItems(...servers: string[]) {
    servers = validateServers(...servers);

    return this.model
      .find()
      .then((items) =>
        Promise.all(items.map((item) => this.updateItem(item, ...servers)))
      );
  }
}

/** Item helper for gatherable items */
export const gatherableItemHelper = new ItemHelper(
  GatherableItem,
  (itemDetails: IGatherableItem) => {
    return {
      task: itemDetails.task,
      patch: itemDetails.patch, //TODO I shoud aim to get rid of this function
    };
  },
  "task"
);

/** Item helper for aethersands */
export const aethersandItemHelper = new ItemHelper(
  AethersandItem,
  (itemDetails: IAethersandItem) => {
    return {
      icon: itemDetails.icon,
    };
  },
  "icon"
);

/** Item helper for tomestone materials */
export const phantasmagoriaItemHelper = new ItemHelper<
  IPhantaItemBaseDocument,
  IPhantaItem
>(
  PhantaItem,
  (itemDetails: IPhantaItem) => {
    return {
      tomestonePrice: itemDetails.tomestonePrice,
    };
  },
  "tomestonePrice"
);
