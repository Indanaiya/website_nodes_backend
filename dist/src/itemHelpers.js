"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.phantasmagoriaItemHelper = exports.aethersandItemHelper = exports.gatherableItemHelper = exports.ItemHelpers = exports.getMarketInfo = void 0;
const Item_model_js_1 = require("../models/Item.model.js");
const fs_1 = require("fs");
const constants_js_1 = require("../src/constants.js");
const fetchFromUniversalis_js_1 = require("../src/fetchFromUniversalis.js");
const errors_js_1 = require("../src/errors.js");
/**
 * Get market information for the specified item and server
 *
 * @param universalisId
 * @param server
 */
function getMarketInfo(universalisId, server) {
    return __awaiter(this, void 0, void 0, function* () {
        const universalisObj = yield fetchFromUniversalis_js_1.default(universalisId, server);
        //Destructuring the universalis object
        const { listings: { 0: { pricePerUnit }, }, regularSaleVelocity, nqSaleVelocity, hqSaleVelocity, averagePrice, averagePriceNQ, averagePriceHQ, lastUploadTime, } = universalisObj;
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
    });
}
exports.getMarketInfo = getMarketInfo;
/**
 * A class to assist with interacting with the database for Items
 */
class ItemHelpers {
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
            const requiredItems = yield fs_1.promises
                .readFile(itemsJsonPath, "utf8")
                .then((data) => JSON.parse(data));
            const requiredItemNames = Object.keys(requiredItems);
            const presentItemNames = yield this.model
                .find()
                .then((items) => items.map((item) => item.name));
            const nonPresentItemNames = requiredItemNames.filter((itemName) => !presentItemNames.includes(itemName));
            return Promise.allSettled(nonPresentItemNames.map((itemName) => this.addItem(requiredItems[itemName])));
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
    // TODO what the heck do these return values mean (USE AN ENUM)
    // TODO I think there might be an issue here with addItem doing multiple things
    addItem(itemDetails, server = constants_js_1.DEFAULT_SERVER) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let savedItemsWithItemName;
            try {
                // There appears to be an issue with mongoose and generics not allowing me to use queries correctly so this is a workaround
                const model = this.model;
                savedItemsWithItemName = yield model.find({ name: itemDetails.name });
                console.log(savedItemsWithItemName);
            }
            catch (err) {
                throw new errors_js_1.DBError(`Error adding ${itemDetails.name} while trying to access DB: ${err}`);
            }
            if (savedItemsWithItemName.length > 1) {
                throw new errors_js_1.DBError(`Too many items. Searching for ${itemDetails.name} returned ${savedItemsWithItemName.length} results.`);
            }
            //Information requested already exists in collection?:
            console.log("savedItems", savedItemsWithItemName);
            if (savedItemsWithItemName.length === 1 &&
                ((_b = (_a = savedItemsWithItemName[0].marketInfo) === null || _a === void 0 ? void 0 : _a[server]) === null || _b === void 0 ? void 0 : _b.price) !== undefined) {
                return 0;
            }
            const marketInfo = yield getMarketInfo(itemDetails.universalisId, server);
            //Save price
            if (savedItemsWithItemName.length === 1) {
                const item = savedItemsWithItemName[0];
                if (item.marketInfo === undefined) {
                    item.marketInfo = {};
                }
                item.marketInfo[server] = marketInfo;
                return item.save().then(() => 1);
            }
            else {
                const item = new this.model(Object.assign({ name: itemDetails.name, marketInfo: { [server]: marketInfo }, universalisId: itemDetails.universalisId }, this.addFunction(itemDetails)));
                return item.save().then(() => 2);
            }
        });
    }
    /** READ */
    /**
     * Get all of the documents for this item type
     * @param  {...string} servers The servers to retrieve market information from (will update the prices if they are outdated)
     */
    getItems(...servers) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sort out servers
            servers.forEach((server) => {
                if (!constants_js_1.SERVERS.includes(server)) {
                    throw new errors_js_1.InvalidArgumentError(`${server} is not a valid server name`);
                }
            });
            if (servers.length === 0) {
                servers = [constants_js_1.DEFAULT_SERVER];
            }
            // Update the out of date items
            const items = yield this.model.find();
            const outOfDatePrices = items.map((item) => {
                const outOfDateServers = item.marketInfo === undefined
                    ? // There is no price information therefore we need price information for all servers
                        servers
                    : // Find which servers have out of date information and return only those
                        servers.filter((server) => {
                            var _a, _b, _c;
                            if (((_a = item.marketInfo[server]) === null || _a === void 0 ? void 0 : _a.updatedAt) === undefined ||
                                new Date(item.marketInfo[server].updatedAt).getTime() +
                                    constants_js_1.ITEM_TTL * 1000 <
                                    Date.now()) {
                                // Everything here except return true is just for console readouts
                                const undef = ((_b = item.marketInfo[server]) === null || _b === void 0 ? void 0 : _b.updatedAt) === undefined;
                                const outOfDate = new Date((_c = item.marketInfo[server]) === null || _c === void 0 ? void 0 : _c.updatedAt).getTime() +
                                    constants_js_1.ITEM_TTL * 1000 <
                                    Date.now();
                                console.log(`Updating ${item.name} on server ${server}, out of date\n Undefined?: ${undef}\n Out of date?: ${outOfDate}`);
                                return true;
                            }
                            else {
                                return false;
                            }
                        });
                // The servers that this item has out of date price information for
                return {
                    item,
                    servers: outOfDateServers,
                };
            });
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
            // Parameter validation
            if (item.isNew) {
                throw new errors_js_1.InvalidArgumentError(`'item' is new: ${item}`);
            }
            //TODO make a unified function for server validation
            servers.forEach((server) => {
                if (!constants_js_1.SERVERS.includes(server)) {
                    console.log(constants_js_1.SERVERS.includes(server));
                    console.log({ server });
                    throw new errors_js_1.InvalidArgumentError(`Server ${server} is not a valid server name`);
                }
            });
            if (servers.length === 0) {
                servers = [constants_js_1.DEFAULT_SERVER];
            }
            if (item.marketInfo === undefined) {
                item.marketInfo = {};
            }
            yield Promise.all(servers.map((server) => {
                return fetchFromUniversalis_js_1.default(item.universalisId, server).then((universalisObj) => {
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
                servers = [constants_js_1.DEFAULT_SERVER];
            }
            return this.model
                .find()
                .then((items) => Promise.all(items.map((item) => this.updateItem(item, ...servers))));
        });
    }
}
exports.ItemHelpers = ItemHelpers;
exports.gatherableItemHelper = new ItemHelpers(Item_model_js_1.GatherableItem, (itemDetails) => {
    return {
        task: itemDetails.task,
    };
}, "task");
exports.aethersandItemHelper = new ItemHelpers(Item_model_js_1.AethersandItem, (itemDetails) => {
    return {
        icon: itemDetails.icon,
    };
}, "icon");
exports.phantasmagoriaItemHelper = new ItemHelpers(Item_model_js_1.PhantaItem, (itemDetails) => {
    return {
        tomestonePrice: itemDetails.tomestonePrice,
    };
}, "tomestonePrice");
//# sourceMappingURL=itemHelpers.js.map