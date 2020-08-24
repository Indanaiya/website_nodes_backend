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

async function addNode(nodeDetails) {
  if(nodeDetails.filters === undefined){
    nodeDetails.filters = {};
  }
  nodeDetails.filters.task = {};
  const itemsThisNodeHas = await GatherableItem.find({ name: nodeDetails.items });
  console.log(itemsThisNodeHas)
  //To be used to filter nodes
  itemsThisNodeHas.map((item) => {
    if (item.task?.reducible) nodeDetails.filters.task.reducible = true;
    if (item.task?.whiteScrips) nodeDetails.filters.task.whiteScrips = true;
    if (item.task?.yellowScrips) nodeDetails.filters.task.yellowScrips = true;
  });

  console.log(nodeDetails)

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

async function addAllNodes() {
  const requiredNodes = await fs
    .readFile(GATHERING_NODES_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data).nodes);

  return Promise.all(
    requiredNodes.map((nodeDetails) =>
      addNode(nodeDetails).catch((err) => {
        if (err instanceof IdenticalNodePresentError) {
          console.log("Node already present");
        } else {
          throw err;
        }
      })
    )
  );
}

/** READ */

async function getAllNodes() {
  return GatheringNode.find();
}

module.exports = { addAllNodes, getAllNodes };
