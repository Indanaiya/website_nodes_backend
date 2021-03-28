import * as express from "express";

import NodeHelpers from "../src/nodeHelpers.js";
import {
  aethersandItemHelper,
  gatherableItemHelper,
} from "../src/itemHelpers.js";
import { getServers } from "./getServers.js";
import {
  IProtoItemBaseDocument,
  IGatherableItemBaseDocument,
  IScrips,
  IAethersandItemBaseDocument,
} from "../models/Item.model.js";

interface NewGatherableItemBaseDocument
  extends Omit<IGatherableItemBaseDocument, "task"> {
  task: {
    aetherialReduce: IProtoItemBaseDocument;
    whiteScrips: IScrips;
    yellowScrips: IScrips;
  };
}

/**
 * Convert an array of items into an object containing all of those items indexed by their item IDs
 * @param items The array of items to be converted
 */
function itemArrayToItemObject<ItemObject extends { universalisId: number }>(
  items: ItemObject[]
) {
  return items.reduce(
    (itemsObject: { [key: number]: ItemObject }, currentItem) => {
      itemsObject[currentItem.universalisId] = currentItem;
      return itemsObject;
    },
    {}
  );
}

/**
 * Get information about all saved aethersands for the provided servers
 * @param servers The servers to get price information for
 */
async function getAethersands(
  ...servers: string[]
): Promise<{
  [key: number]: IAethersandItemBaseDocument;
}> {
  const aethersandsArray = await aethersandItemHelper.getItems(...servers);
  console.log({failures: aethersandsArray.failures})
  return itemArrayToItemObject(aethersandsArray.items);
}

/**
 * Get information about all saved gatherable items for the provided servers
 * @param servers The servers to get price information for
 */
async function getGatherableItems(
  ...servers: string[]
): Promise<{
  [key: number]: NewGatherableItemBaseDocument;
}>{
  const aethersands = await getAethersands(...servers);
  const gatherableItemsArray = await gatherableItemHelper.getItems(...servers);
  console.log({failures: gatherableItemsArray.failures})
  const newGatherableItems: NewGatherableItemBaseDocument[] = gatherableItemsArray.items.map(
    (item: any) => {
      if (item.task?.aetherialReduce !== undefined) {
        item.task.aetherialReduce.forEach(
          (sandId: number, sandIndex: number) => {
            item.task.aetherialReduce[sandIndex] = aethersands[sandId];
          }
        );
      }
      return item;
    }
  );
  return itemArrayToItemObject<NewGatherableItemBaseDocument>(
    newGatherableItems
  );
}

/**
 * Get an array of all the nodes saved in the database, with price info for the servers specified
 * @param servers The servers to get price information for
 */
async function getNodesWithItemData(...servers: string[]) {
  const [gatherableItems, nodes] = await Promise.all([
    getGatherableItems(...servers),
    NodeHelpers.getAllNodes(),
  ]);
  return nodes.map(
    ({
      filters,
      location,
      spawnTimes,
      _id,
      items: oldItems,
      lifespan,
      name,
      level,
    }) => {
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
    }
  );
}

const router = express.Router();

router.route("/").get((_, res) => {
  NodeHelpers.getAllNodes()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/withItemData/:serverOrDatacenter").get(async (req, res) => {
  // Decide what servers to get information for
  const servers = getServers(req.params.serverOrDatacenter);
  if (servers === undefined) {
    res
      .status(422)
      .json(
        `Parameter not recognised. ${req.params.serverOrDatacenter} is not a valid server or datacenter`
      );
    return;
  }

  getNodesWithItemData(...servers)
    .then((nodes) => res.json(nodes))
    .catch((err) => {
      console.log(
        "An error occured at '/withItemData/:serverOrDatacenter', while fetching nodes\n",
        err
      );
      res.status(500).json("An error occured while fetching the nodes");
    });
});

export default router;
