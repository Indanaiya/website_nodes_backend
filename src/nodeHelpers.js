const GatheringNode = require("../models/Node.model");
const { GatherableItem } = require("../models/Item.model");
// const { Document } = require("mongoose");
// const fetch = require("node-fetch");
const fs = require("fs").promises;

const { GATHERING_NODES_JSON_PATH } = require("../src/constants");
const { InvalidArgumentError } = require("../src/errors");

class IdenticalNodePresentError extends Error {
  constructor(message) {
    super(message);
    this.name = "IdenticalNodePresentError";
  }
}

/** CREATE */
/**
 * Add the node consistent with the object provided to the collection
 *
 * @param {{items:[string], filters:{patch: number, class: string, nodeType: string, tome:string}, location: {map: string, x: number, y: number}, spawnTimes: [number], lifespan: number, level: number, name: string}} nodeDetails An object containing the necessary information to add a node to the collection.
 */
async function addNode(nodeDetails) {
  nodeDetails.filters.task = {};
  const itemsThisNodeHas = await GatherableItem.find({
    name: nodeDetails.items,
  });
  console.log(itemsThisNodeHas);
  //To be used to filter nodes
  itemsThisNodeHas.map((item) => {
    if (item.task?.reducible) nodeDetails.filters.task.reducible = true;
    if (item.task?.whiteScrips) nodeDetails.filters.task.whiteScrips = true;
    if (item.task?.yellowScrips) nodeDetails.filters.task.yellowScrips = true;
  });

  const node = new GatheringNode({
    ...nodeDetails,
  });

  await node
    .validate()
    .catch(
      (err) =>
        new InvalidArgumentError(
          `${nodeDetails} does not create a vaild GatheringNode object: ${err}`
        )
    );

  const identicalNodes = await GatheringNode.find({
    "location.map": nodeDetails.location.map,
    "location.x": nodeDetails.location.x,
    "location.y": nodeDetails.location.y,
  });
  if (identicalNodes.length !== 0) {
    // Assume that if they are in the exact same location, it is the same node
    throw new IdenticalNodePresentError(
      `A node already exists at this location: \n${identicalNodes}`
    );
  }

  return node.save();
}

/**
 * Add all nodes in the file at GATHERING_NODES_JSON_PATH to the db
 * @returns {Promise<string[]>}
 */
async function addAllNodes() {
  const requiredNodes = await fs
    .readFile(GATHERING_NODES_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data).nodes);

  return Promise.all(
    requiredNodes.map((nodeDetails) =>
      addNode(nodeDetails)
        .then(() => `Node ${nodeDetails} saved.`)
        .catch((err) => {
          if (err instanceof IdenticalNodePresentError) {
            return `Node ${nodeDetails} already present.`;
          } else {
            throw err;
          }
        })
    )
  );
}

/** READ */
/**
 * Get all nodes in the collection
 * @returns {Document[]} All documents in the nodes collection028
 */
async function getAllNodes() {
  return GatheringNode.find();
}

module.exports = { addAllNodes, getAllNodes };
