import { GatheringNode } from "../models/Node.model.js";
import { GatherableItem } from "../models/Item.model.js";
import { promises as fs } from "fs";

import {
  InvalidArgumentError,
  IdenticalNodePresentError,
} from "../src/errors.js";

interface NodeDetails {
  items: [string];
  filters: {
    patch: number;
    job: string;
    nodeType: string;
    tome: string;
    task?: {
      reducible?: boolean;
      whiteScrips?: boolean;
      yellowScrips?: boolean;
    };
  };
  location: { map: string; x: number; y: number };
  spawnTimes: [number];
  lifespan: number;
  level: number;
  name: string;
}

/** CREATE */
/**
 * Add the node consistent with the object provided to the collection
 *
 * @param nodeDetails An object containing the necessary information to add a node to the collection.
 */
async function addNode(nodeDetails: NodeDetails) {
  const itemsThisNodeHas = await GatherableItem.find({
    universalisId: {
      $in: nodeDetails.items.map((itemStr) => Number.parseInt(itemStr)),
    },
  });

  nodeDetails.filters.task = {
    reducible: itemsThisNodeHas.some(
      (item) => item.task.aetherialReduce !== undefined
    ),
    whiteScrips: itemsThisNodeHas.some(
      (item) => item.task.whiteScrips?.MidCollectability !== undefined
    ),
    yellowScrips: itemsThisNodeHas.some(
      (item) => item.task.yellowScrips?.MidCollectability !== undefined
    ),
  };

  const node = new GatheringNode({
    ...nodeDetails,
  });

  console.log({ node: node.filters.task });

  const result = await node.validate().catch((err) => {
    console.log("The folowing node is invalid: ", node);
    return new InvalidArgumentError(
      `${nodeDetails} does not create a vaild GatheringNode object: ${err}`
    );
  });
  if (result instanceof Error) {
    throw result;
  }

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
 * Add all nodes in the file at path to the db
 * @param path The path to the json file containing the node information
 * @returns
 */
async function addAllNodes(nodesJsonPath: string, nodes?: NodeDetails[]): Promise<string[]> {
  const requiredNodes =
    nodes ??
    (await fs.readFile(nodesJsonPath, "utf8").then((data) => JSON.parse(data)));

  return Promise.all(
    requiredNodes.map((nodeDetails: NodeDetails) =>
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

export default { addAllNodes, getAllNodes, addNode };
