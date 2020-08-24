"use strict";

const router = require("express").Router();
const ItemHelper = require("../src/itemHelpers");
const { DATACENTERS } = require("../src/constants");

router.route("/").get((req, res) => {
  ItemHelper.phantasmagoria
    .getItems()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/phantasmagoria").get((req, res) => {
  const server = req.query.server;
  const datacenter = req.query.datacenter;
  if (server !== undefined && datacenter !== undefined) {
    res.status(422).json({
      message: "Expected only one of server and datacenter",
      server,
      datacenter,
    });
  } else if (server === undefined && datacenter === undefined) {
    //Non phanta items might have useful information to return here
    ItemHelper.phantasmagoria
      .getItems()
      .then((response) => res.json(response))
      .catch((err) => res.status(400).json("Error: " + err));
  } else {
    const servers =
      datacenter === undefined ? [server] : DATACENTERS[datacenter];
    console.log(servers);
    ItemHelper.phantasmagoria
      .getItems(...servers)
      .then((response) => res.json(response))
      .catch((err) => res.status(400).json("Error: " + err));
  }
});

router.route("/gatherable").get((req, res) => {
  const server = req.query.server;
  const datacenter = req.query.datacenter;
  if (server !== undefined && datacenter !== undefined) {
    res.status(422).json({
      message: "Expected only one of server and datacenter",
      server,
      datacenter,
    });
  } else if (server === undefined && datacenter === undefined) {
    //Non phanta items might have useful information to return here
    ItemHelper.gatherable
      .getItems()
      .then((response) => res.json(response))
      .catch((err) => res.status(400).json("Error: " + err));
  } else {
    const servers =
      datacenter === undefined ? [server] : DATACENTERS[datacenter];
    console.log(servers);
    ItemHelper.gatherable
      .getItems(...servers)
      .then((response) => res.json(response))
      .catch((err) => res.status(400).json("Error: " + err));
  }
});

// router.route("/:id").get(async (req, res) => {
//   const server = req.query.server;
//   const datacenter = req.query.datacenter;
//   const id = req.params.id;
//   if (server !== undefined && datacenter !== undefined) {
//     res.status(422).json({
//       message: "Expected only one of server and datacenter",
//       server,
//       datacenter,
//     });
//   } else if (server === undefined && datacenter === undefined) {
//     //Non phanta items might have useful information to return here
//     const phantaMats = JSON.parse(await phantaJsonPromise);
//     const matchingItemNames = Object.keys(phantaMats).filter(
//       (phantaMat) => phantaMats[phantaMat].universalisId === id
//     );
//     console.log(matchingItemNames);
//     const matchingItems = {};
//     for (let name of matchingItemNames) {
//       matchingItems[name] = phantaMats[name];
//     }
//     res.json(matchingItems);
//   } else {
//     ItemHelper.getItem(id, server).then((response) => res.json(response));
//   }
// });

router.route("/updateAll/:server").post((req, res) => {
  const server = req.params.server;
  if (req.body.pass !== "update123") {
    res.json("Invalid.");
  }
  ItemHelper.updateAllItems(server)
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

module.exports = router;
