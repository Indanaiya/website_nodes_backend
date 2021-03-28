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
exports.phantasmagoriaItemHelper = exports.aethersandItemHelper = exports.gatherableItemHelper = exports.ItemHelper = exports.addItemReturn = exports.getMarketInfo = void 0;
const Item_model_js_1 = require("../models/Item.model.js");
const fs_1 = require("fs");
const constants_js_1 = require("../src/constants.js");
const fetchFromUniversalis_js_1 = require("../src/fetchFromUniversalis.js");
const errors_js_1 = require("../src/errors.js");
const validateServers_js_1 = require("./validateServers.js");
/**
 * Get market information for the specified item and server
 *
 * @param universalisId The id of the item to retrieve market information for
 * @param server The server that the prices should be fetched for
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
var addItemReturn;
(function (addItemReturn) {
    addItemReturn[addItemReturn["ALREADY_PRESENT"] = 0] = "ALREADY_PRESENT";
    addItemReturn[addItemReturn["ADDED"] = 1] = "ADDED";
})(addItemReturn = exports.addItemReturn || (exports.addItemReturn = {}));
/**
 * A class to assist with interacting with the database for Items
 */
class ItemHelper {
    constructor(model, addFunction = () => ({}), projection = "") {
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
     * @param itemDetails Information about the item to be added
     */
    addItem(itemDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            let savedItemsWithItemName;
            try {
                // There appears to be an issue with mongoose and generics not allowing me to use queries correctly so this is a workaround
                const model = this.model;
                savedItemsWithItemName = yield model.find({ name: itemDetails.name });
            }
            catch (err) {
                throw new errors_js_1.DBError(`Error adding ${itemDetails.name} while trying to access DB: ${err}`);
            }
            if (savedItemsWithItemName.length > 1) {
                throw new errors_js_1.DBError(`Too many items. Searching for ${itemDetails.name} returned ${savedItemsWithItemName.length} results.`);
            }
            if (savedItemsWithItemName.length === 1) {
                return addItemReturn.ALREADY_PRESENT;
            }
            else {
                const item = new this.model(Object.assign({ name: itemDetails.name, universalisId: itemDetails.universalisId }, this.addFunction(itemDetails)));
                // This can be removed for performance reasons but it's a handy thing to have in case something goes wrong
                const valid = item.validateSync();
                if (valid !== undefined) {
                    console.log({ reason: valid, item, itemDetails });
                    throw valid;
                }
                return item.save().then(() => addItemReturn.ADDED);
            }
        });
    }
    /** READ */
    /**
     * Get all of the documents for this item type
     *
     * @param servers The servers to retrieve market information from (will update the prices if they are outdated)
     */
    getItems(...servers) {
        return __awaiter(this, void 0, void 0, function* () {
            servers = validateServers_js_1.validateServers(...servers);
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
     *
     * @param item The item to update market information for
     * @param servers The servers that the item should have updated market information for
     */
    updateItem(item, ...servers) {
        return __awaiter(this, void 0, void 0, function* () {
            // Parameter validation
            if (item.isNew) {
                throw new errors_js_1.InvalidArgumentError(`'item' is new: ${item}`);
            }
            servers = validateServers_js_1.validateServers(...servers);
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
                }).catch((err) => {
                    if (err instanceof errors_js_1.ItemNotFoundError) {
                        // TODO aught to make it null or an empty object to differentiate between unmarketable and not-looked up yet
                        console.log(`Item not found: ${item.universalisId}`);
                    }
                    else {
                        throw err;
                    }
                });
            }));
            return item.save().then(() => item);
        });
    }
    /**
     * Update the market information for the given servers for all items in a collection
     *
     * @param servers The servers for which market information should be updated
     */
    updateAllItems(...servers) {
        return __awaiter(this, void 0, void 0, function* () {
            servers = validateServers_js_1.validateServers(...servers);
            return this.model
                .find()
                .then((items) => Promise.all(items.map((item) => this.updateItem(item, ...servers))));
        });
    }
}
exports.ItemHelper = ItemHelper;
/** Item helper for gatherable items */
exports.gatherableItemHelper = new ItemHelper(Item_model_js_1.GatherableItem, (itemDetails) => {
    return {
        task: itemDetails.task,
        patch: itemDetails.patch,
    };
}, "task");
/** Item helper for aethersands */
exports.aethersandItemHelper = new ItemHelper(Item_model_js_1.AethersandItem, (itemDetails) => {
    return {
        icon: itemDetails.icon,
    };
}, "icon");
/** Item helper for tomestone materials */
exports.phantasmagoriaItemHelper = new ItemHelper(Item_model_js_1.PhantaItem, (itemDetails) => {
    return {
        tomestonePrice: itemDetails.tomestonePrice,
    };
}, "tomestonePrice");
//# sourceMappingURL=itemHelpers.js.map