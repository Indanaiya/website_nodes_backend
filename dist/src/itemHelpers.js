var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PhantaItem, GatherableItem, AethersandItem, } from "../models/Item.model.js";
import { promises as fs } from "fs";
import { DEFAULT_SERVER, ITEM_TTL, SERVERS } from "../src/constants.js";
import fetchFromUniversalis from "../src/fetchFromUniversalis.js";
import { InvalidArgumentError, DBError } from "../src/errors.js";
/**
 * A class to assist with interacting with the database for Items
 */
export class ItemHelpers {
    constructor(model, addFunction = () => ({}), projection = "") {
        this.model = model;
        this.addFunction = addFunction;
        this.projection = projection;
    }
    /** CREATE */
    /**
     * Add all items in the json to the model's collection
     */
    addAllItems(itemsJsonPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredItems = yield fs
                .readFile(itemsJsonPath, "utf8")
                .then((data) => JSON.parse(data));
            const requiredItemNames = Object.keys(requiredItems);
            const presentItemNames = yield this.model
                .find()
                .then((items) => items.map((item) => item.name));
            const nonPresentItemNames = requiredItemNames.filter((itemName) => !presentItemNames.includes(itemName));
            return Promise.allSettled(nonPresentItemNames.map((itemName) => this.addItem(itemName, requiredItems[itemName])));
        });
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
    addItem(itemName, itemDetails, server = DEFAULT_SERVER) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (itemName === undefined || itemDetails === undefined) {
                throw new InvalidArgumentError(`Cannot have an undefined argument. itemName: ${itemName}, itemDetails: ${itemDetails}`);
            }
            let savedItemsWithItemName;
            try {
                // There appears to be an issue with mongoose and generics not allowing me to use queries correctly so this is a workaround
                const model = this.model;
                savedItemsWithItemName = yield model.find({ name: itemName });
            }
            catch (err) {
                throw new DBError(`Error adding ${itemName} while trying to access DB: ${err}`);
            }
            if (savedItemsWithItemName.length > 1) {
                throw new DBError(`Too many items. Searching for ${itemName} returned ${savedItemsWithItemName.length} results.`);
            }
            //Information requested already exists in collection?:
            if (savedItemsWithItemName.length === 1 &&
                ((_a = savedItemsWithItemName[0].marketInfo[server]) === null || _a === void 0 ? void 0 : _a.price) !== undefined) {
                return 0;
            }
            const universalisObj = yield fetchFromUniversalis(itemDetails.universalisId, server);
            const { listings: { 0: { pricePerUnit }, }, regularSaleVelocity, nqSaleVelocity, hqSaleVelocity, averagePrice, averagePriceNQ, averagePriceHQ, lastUploadTime, } = universalisObj;
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
            }
            else {
                const item = new this.model(Object.assign({ name: itemName, marketInfo: { [server]: marketInfo }, universalisId: itemDetails.universalisId }, this.addFunction(itemDetails, universalisObj)));
                return item.save().then(() => 2);
            }
        });
    }
    /** READ */
    /**
     * Get all items in a collection
     * @param {Model} model The model for the collection to get items for
     * @param {string} fieldsToGet Which fields from the documents to return, as a space seperated string
     * @param  {...string} servers The servers to retrieve market information from (will update the prices if they are outdated)
     */
    getItems(...servers) {
        return __awaiter(this, void 0, void 0, function* () {
            servers.forEach((server) => {
                if (!SERVERS.includes(server)) {
                    throw new InvalidArgumentError(`${server} is not a valid server name`);
                }
            });
            if (servers.length === 0) {
                servers = [DEFAULT_SERVER];
            }
            //Update the out of date items
            const outOfDatePrices = yield this.model.find().then((items) => items.map((item) => {
                const outOfDateServers = { item, servers: [] };
                servers.forEach((server) => {
                    var _a, _b, _c;
                    if (((_a = item.marketInfo[server]) === null || _a === void 0 ? void 0 : _a.updatedAt) === undefined ||
                        new Date(item.marketInfo[server].updatedAt).getTime() +
                            ITEM_TTL * 1000 <
                            Date.now()) {
                        const undef = ((_b = item.marketInfo[server]) === null || _b === void 0 ? void 0 : _b.updatedAt) === undefined;
                        const ood = new Date((_c = item.marketInfo[server]) === null || _c === void 0 ? void 0 : _c.updatedAt).getTime() +
                            ITEM_TTL * 1000 <
                            Date.now();
                        console.log(`Updating ${item.name} on server ${server}, out of date\n Undefined?: ${undef}\n Out of date?: ${ood}`);
                        outOfDateServers.servers.push(server);
                    }
                });
                return outOfDateServers;
            }));
            yield Promise.all(outOfDatePrices.map((item) => item.servers.length > 0
                ? this.updateItem(item.item, ...item.servers)
                : null));
            //Return the items
            const projection = servers.map((server) => `marketInfo.${server}`).join(" ") +
                " name universalisId " +
                this.projection;
            return this.model.find({}, projection);
        });
    }
    /** UPDATE */
    /**
     * Update the market information for an item for the given server(s)
     */
    updateItem(item, ...servers) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    throw new InvalidArgumentError(`Server ${server} is not a valid server name`);
                }
            });
            if (servers.length === 0) {
                servers = [DEFAULT_SERVER];
            }
            yield Promise.all(servers.map((server) => {
                return fetchFromUniversalis(item.universalisId, server).then((universalisObj) => {
                    var _a, _b;
                    item.marketInfo[server] = {
                        price: (_b = (_a = universalisObj.listings[0]) === null || _a === void 0 ? void 0 : _a.pricePerUnit) !== null && _b !== void 0 ? _b : null,
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
            }));
            return item.save().then(() => item);
        });
    }
    /**
     * Update the market information for the given servers for all items in a collection
     * @param model The model for the collection to be updated
     * @param servers The servers for which market information should be updated
     */
    updateAllItems(...servers) {
        return __awaiter(this, void 0, void 0, function* () {
            if (servers.length === 0) {
                servers = [DEFAULT_SERVER];
            }
            return this.model
                .find()
                .then((items) => Promise.all(items.map((item) => this.updateItem(item, ...servers))));
        });
    }
}
export const gatherableItemHelper = new ItemHelpers(GatherableItem, (itemDetails) => {
    return {
        task: itemDetails.task,
    };
}, "task");
export const aethersandItemHelper = new ItemHelpers(AethersandItem, (itemDetails) => {
    return {
        icon: itemDetails.icon,
    };
}, "icon");
export const phantasmagoriaItemHelper = new ItemHelpers(PhantaItem, (itemDetails) => {
    return {
        tomestonePrice: itemDetails.tomestonePrice,
    };
}, "tomestonePrice");
//# sourceMappingURL=itemHelpers.js.map