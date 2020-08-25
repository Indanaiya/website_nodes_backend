const router = require("express").Router();

const NodeHelpers = require("../src/nodeHelpers");
const ItemHelpers = require("../src/itemHelpers");
const { DATACENTERS, SERVERS } = require("../src/constants");

router.route("/").get((req, res) => {
  NodeHelpers.getAllNodes()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/withItemData/:serverOrDatacenter").get(async (req, res) => {
  const serverOrDatacenter = req.params.serverOrDatacenter;
  let servers;
  if (Object.keys(DATACENTERS).includes(serverOrDatacenter)) {
    servers = DATACENTERS[serverOrDatacenter];
  } else if (SERVERS.includes(serverOrDatacenter)) {
    servers = [serverOrDatacenter];
  } else {
    res
      .status(422)
      .json(
        `Parameter not recognised. ${serverOrDatacenter} is not a valid server or datacenter`
      );
    return;
  }

  const gatherableItems = await ItemHelpers.gatherable
    .getItems(...servers)
    .then((gatherableItemsArray) =>
      gatherableItemsArray.reduce((gatherableItemsObject, currentItem) => {
        gatherableItemsObject[currentItem.name] = currentItem;
        return gatherableItemsObject;
      }, {})
    )
    .catch((err) => {
      console.log(
        "An error occured at '/withItemData/:serverOrDatacenter', while fetching items\n",
        err
      );
      res.status(500).json("An error occured while fetching items");
    });

  if (!gatherableItems) return;

  NodeHelpers.getAllNodes()
    .then((oldNodes) =>
      //Need to make a new object for each node because nodes are Documents and it will enforce weird checking that I don't want
      oldNodes.map(({ filters, location, spawnTimes, _id, items, lifespan, name, level }) => {
        items = items.map((item) => gatherableItems[item]);
        return { filters, location, spawnTimes, _id, items, lifespan, name, level };
      })
    )
    .then((newNodes) => res.json(newNodes))
    .catch((err) => {
      console.log(
        "An error occured at '/withItemData/:serverOrDatacenter', while fetching nodes\n",
        err
      );
      res.status(500).json("An error occured while fetching the nodes");
    });
});

module.exports = router;
