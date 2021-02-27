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
const express_1 = require("express");
const nodeHelpers_js_1 = require("../src/nodeHelpers.js");
const itemHelpers_js_1 = require("../src/itemHelpers.js");
const getServers_js_1 = require("./getServers.js");
/**
 * Convert an array of items into an object containing all of those items indexed by their item IDs
 * @param items The array of items to be converted
 */
function itemArrayToItemObject(items) {
    return items.reduce((itemsObject, currentItem) => {
        itemsObject[currentItem.universalisId] = currentItem;
        return itemsObject;
    }, {});
}
/**
 * Get information about all saved aethersands for the provided servers
 * @param servers The servers to get price information for
 */
function getAethersands(...servers) {
    return __awaiter(this, void 0, void 0, function* () {
        const aethersandsArray = yield itemHelpers_js_1.aethersandItemHelper.getItems(...servers);
        return itemArrayToItemObject(aethersandsArray);
    });
}
/**
 * Get information about all saved gatherable items for the provided servers
 * @param servers The servers to get price information for
 */
function getGatherableItems(...servers) {
    return __awaiter(this, void 0, void 0, function* () {
        const aethersands = yield getAethersands(...servers);
        const gatherableItemsArray = yield itemHelpers_js_1.gatherableItemHelper.getItems(...servers);
        const newGatherableItems = gatherableItemsArray.map((item) => {
            var _a;
            if (((_a = item.task) === null || _a === void 0 ? void 0 : _a.aetherialReduce) !== undefined) {
                item.task.aetherialReduce.forEach((sandId, sandIndex) => {
                    item.task.aetherialReduce[sandIndex] = aethersands[sandId];
                });
            }
            return item;
        });
        return itemArrayToItemObject(newGatherableItems);
    });
}
/**
 * Get an array of all the nodes saved in the database, with price info for the servers specified
 * @param servers The servers to get price information for
 */
function getNodesWithItemData(...servers) {
    return __awaiter(this, void 0, void 0, function* () {
        const [gatherableItems, nodes] = yield Promise.all([getGatherableItems(...servers), nodeHelpers_js_1.default.getAllNodes()]);
        return nodes.map(({ filters, location, spawnTimes, _id, items: oldItems, lifespan, name, level, }) => {
            const items = oldItems.map((item) => gatherableItems[item]);
            return {
                filters,
                location,
                spawnTimes,
                _id,
                items,
                lifespan,
                name,
                level,
            };
        });
    });
}
const router = express_1.default.Router();
router.route("/").get((_, res) => {
    nodeHelpers_js_1.default.getAllNodes()
        .then((response) => res.json(response))
        .catch((err) => res.status(400).json("Error: " + err));
});
router.route("/withItemData/:serverOrDatacenter").get((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Decide what servers to get information for
    const servers = getServers_js_1.getServers(req.params.serverOrDatacenter);
    if (servers === undefined) {
        res
            .status(422)
            .json(`Parameter not recognised. ${req.params.serverOrDatacenter} is not a valid server or datacenter`);
        return;
    }
    getNodesWithItemData(...servers)
        .then((nodes) => res.json(nodes))
        .catch((err) => {
        console.log("An error occured at '/withItemData/:serverOrDatacenter', while fetching nodes\n", err);
        res.status(500).json("An error occured while fetching the nodes");
    });
}));
exports.default = router;
//# sourceMappingURL=nodes.js.map