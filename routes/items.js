"use strict";

const router = require("express").Router();
const ItemHelper = require("../src/itemsHelpers");
const Item = require("../models/Item.model");
const fs = require("fs").promises;
const { PHANTASMAGORIA_MATS_JSON_PATH } = require("../src/constants");

const phantaJsonPromise = fs.readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8");

router.route("/").get((req, res) => {
  ItemHelper.getItems()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/:id").get((req, res) =>{
  const server = req.query.server;
  const datacenter = req.query.datacenter;
  res.json({server,datacenter});
})

// router.route("/:id").get((req, res) => {
//   const id = req.params.id;
//   phantaJsonPromise
//     .then((phantaJson) => JSON.parse(phantaJson))
//     .then((phantaMats) =>
//       Object.keys(phantaMats).filter(
//         (phantaMat) => phantaMats[phantaMat].universalisId === id
//       )
//     )
//     .then((matchingItems) => res.json(matchingItems));
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
