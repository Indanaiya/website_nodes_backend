const Item = require("../models/Item.model");
const fetch = require("node-fetch");
const fs = require("fs");

const UNIVERSALIS_URL = "https://universalis.app/api/Chaos/"; //Will need to be changed to allow for using different datacenters
const PHANTASMAGORIA_MATS_JSON_PATH = "res/phantasmagoriaMats.json";

function updateItem(item) {
  return new Promise((resolve, reject) =>
    fetch(UNIVERSALIS_URL + item.universalisId)
      .then((response) => response.text())
      .then((body) => {
        item.updatedAt = Date.now().toString();
        console.log(item.updatedAt);
        item.price = JSON.parse(body)["listings"][0]["pricePerUnit"];
        item
          .save()
          .then(() => resolve("Item Updated"))
          .catch((err) => reject(`Error: ${err}`));
      })
      .catch((err) => reject(`Error: ${err}`))
  );
}

function updateAll() {
  return new Promise((resolve, reject) => {
    const update = function (err, data) {
      if (err) {
        console.log(`Couldn't read file: ${err}`);
        reject(err);
        return;
      }
      const items = JSON.parse(data);

      const itemPricePromises = Object.keys(items).map((item) =>
        fetch(UNIVERSALIS_URL + items[item].universalisId)
          .then((response) => response.text())
          .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"])
          .catch((err) => {
            console.log(`Rejected: ${err}`);
            reject(`ItemPricePromises error: ${err}`);
            return;
          })
      );

      Promise.all(itemPricePromises)
        .then((itemPrices) => {
          console.log(itemPrices);
          const itemNames = Object.keys(items);
          for (let i = 0; i < itemPrices.length; i++) {
            console.log(items);
            const itemName = itemNames[i];
            const itemPrice = itemPrices[i];
            const itemUniversalisId = items[itemName].universalisId;

            Item.where({ name: itemName }).findOne((err, item) => {
              if (err) {
                console.log(`Rejected. Unable to save ${itemName}: ${err}`);
              } else {
                if (item) {
                  console.log(`${item}Found`);
                  item.price = itemPrice;
                } else {
                  const item = new Item({
                    name: itemName,
                    price: itemPrice,
                    universalisId: itemUniversalisId,
                  });
                }
                item.save();
              }
            });
          }
        })
        .then(() => resolve("All items updated"))
        .catch((err) => {
          console.log(`Rejected: ${err}`);
          reject(`Saving error: ${err}`);
          return;
        });
    };

    fs.readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8", update);
  });
}

const functionsBundle = { updateItem, updateAll };

module.exports = functionsBundle;
