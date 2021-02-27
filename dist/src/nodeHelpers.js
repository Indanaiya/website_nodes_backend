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
const Node_model_js_1 = require("../models/Node.model.js");
const Item_model_js_1 = require("../models/Item.model.js");
const fs_1 = require("fs");
const errors_js_1 = require("../src/errors.js");
/** CREATE */
/**
 * Add the node consistent with the object provided to the collection
 *
 * @param nodeDetails An object containing the necessary information to add a node to the collection.
 */
function addNode(nodeDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemsThisNodeHas = yield Item_model_js_1.GatherableItem.find({
            universalisId: {
                $in: nodeDetails.items.map((itemStr) => Number.parseInt(itemStr)),
            },
        });
        nodeDetails.filters.task = {
            reducible: itemsThisNodeHas.some((item) => item.task.aetherialReduce !== undefined),
            whiteScrips: itemsThisNodeHas.some((item) => item.task.whiteScrips.MidCollectability !== undefined),
            yellowScrips: itemsThisNodeHas.some((item) => item.task.yellowScrips.MidCollectability !== undefined),
        };
        const node = new Node_model_js_1.GatheringNode(Object.assign({}, nodeDetails));
        console.log({ node: node.filters.task });
        const result = yield node.validate().catch((err) => {
            console.log("The folowing node is invalid: ", node);
            return new errors_js_1.InvalidArgumentError(`${nodeDetails} does not create a vaild GatheringNode object: ${err}`);
        });
        if (result instanceof Error) {
            throw result;
        }
        const identicalNodes = yield Node_model_js_1.GatheringNode.find({
            "location.map": nodeDetails.location.map,
            "location.x": nodeDetails.location.x,
            "location.y": nodeDetails.location.y,
        });
        if (identicalNodes.length !== 0) {
            // Assume that if they are in the exact same location, it is the same node
            throw new errors_js_1.IdenticalNodePresentError(`A node already exists at this location: \n${identicalNodes}`);
        }
        return node.save();
    });
}
/**
 * Add all nodes in the file at path to the db
 * @param {string} path The path to the json file containing the node information
 * @returns {Promise<string[]>}
 */
function addAllNodes(nodesJsonPath, nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        const requiredNodes = nodes !== null && nodes !== void 0 ? nodes : (yield fs_1.promises.readFile(nodesJsonPath, "utf8").then((data) => JSON.parse(data)));
        return Promise.all(requiredNodes.map((nodeDetails) => addNode(nodeDetails)
            .then(() => `Node ${nodeDetails} saved.`)
            .catch((err) => {
            if (err instanceof errors_js_1.IdenticalNodePresentError) {
                return `Node ${nodeDetails} already present.`;
            }
            else {
                throw err;
            }
        })));
    });
}
/** READ */
/**
 * Get all nodes in the collection
 * @returns {Document[]} All documents in the nodes collection028
 */
function getAllNodes() {
    return __awaiter(this, void 0, void 0, function* () {
        return Node_model_js_1.GatheringNode.find();
    });
}
exports.default = { addAllNodes, getAllNodes, addNode };
//# sourceMappingURL=nodeHelpers.js.map