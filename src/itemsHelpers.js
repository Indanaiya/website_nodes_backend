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
      const itemNames = Object.keys(items);

      //An array of promises, the value of each is the lowest price for the item it was mapped from.
      const itemPricePromises = Object.keys(items).map((item) =>
        fetch(UNIVERSALIS_URL + items[item].universalisId)
          .then((response) => response.text())
          .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"])
          .catch((err) => {
            console.log(`Rejected: ${err}`);
            reject(`ItemPricePromises error: ${err}`);
          })
      );

      Promise.all(itemPricePromises)
        .then((itemPrices) => {
          console.log(itemPrices);
          const itemNamesToPrices = {};
          for (let i = 0; i < itemPrices.length; i++) {
            itemNamesToPrices[itemNames[i]] = itemPrices[i];
          }
          return itemNamesToPrices;
        })
        .then((itemNamesToPrices) => {
          const errors = {};

          const itemSavingPromises = itemNames.map((itemName) => {
            const itemPrice = itemNamesToPrices[itemName];
            const itemUniversalisId = items[itemName].universalisId;

            const promise = Item.where({ name: itemName })
              .findOne()
              .then((err, item) => {
                if (err) {
                  console.log(`Unable to find ${itemName}: ${err}`);
                } else {
                  if (item) {
                    console.log(`${item} Found`);
                    item.price = itemPrice;
                  } else {
                    item = new Item({
                      name: itemName,
                      universalisId: itemUniversalisId,
                    });
                  }
                  item.save().catch((err) => {
                    console.log(`Rejected. Unable to save ${itemName}: ${err}`);
                    errors[itemName] = err;
                  });
                }
              })
              .catch((err) => {
                console.log(`Unexpected error occured when saving ${itemName}`);
                errors[itemName] = err;
              });

            return promise;
          });

          Promise.all(itemSavingPromises)
            .then(() => {
              console.log(errors)
              const unsavedItems = Object.keys(errors);
              let resolveMessage = "Updating complete.";
              if (unsavedItems.length > 0) {
                resolveMessage += `Unable to update the following: ${unsavedItems}`;
              }

              resolve(resolveMessage);
            })
            .catch((err) => {
              console.log(`Rejected: ${err}`);
              reject(`Saving error: ${err}`);
            });
        });
    };

    fs.readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8", update);
  });
}

const functionsBundle = { updateItem, updateAll };

module.exports = functionsBundle;
