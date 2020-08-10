"use strict";

const router = require("express").Router();
const ItemHelper = require("../src/itemsHelpers");

router.route("/").get((req, res) => {
  ItemHelper.getItems()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

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
