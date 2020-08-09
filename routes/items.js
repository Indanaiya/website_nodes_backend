"use strict";

const router = require("express").Router();
const Item = require("../models/Item.model");
const ItemHelper = require("../src/itemsHelpers");

const ITEM_TTL = 24 * 60 * 60; //Minutes

router.route("/").get((req, res) => {
  ItemHelper.getItems()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/updateAll").post((req, res) => {
  if (req.body.pass !== "update123") {
    res.json("Invalid.");
  }
  ItemHelper.addItem("Tempest Adhesive")
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

module.exports = router;
