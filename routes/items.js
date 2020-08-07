"use strict";

const router = require("express").Router();
const Item = require("../models/Item.model");
const ItemHelper = require("../src/itemsHelpers");

const ITEM_TTL = 24 * 60 * 60; //Minutes

router.route("/").get((req, res) => {
  const itemUpdates = [];
  Item.find()
    .then((items) => {
      for (let item of items) {
        const itemTime = new Date(item.updatedAt);
        if (Date.now() > itemTime.getTime() + ITEM_TTL * 1000) {
          console.log("Updating: " + item.name);
          itemUpdates.push(ItemHelper.updateItem(item));
        }
      }
    })
    .then(() => {
      Promise.all(itemUpdates)
        .then(() => Item.find())
        .then((items) => res.json(items))
        .catch((err) => res.status(400).json("Error: " + err));
    })
    .catch((err) => res.status(400).json("Error: " + err));
});

router.route("/updateAll").post((req, res) => {
  if (req.body.pass !== "update123") {
    res.json("Invalid.");
  }
  ItemHelper.updateAll()
    .then((response) => res.json(response))
    .catch((err) => res.status(400).json("Error: " + err));
});

module.exports = router;
