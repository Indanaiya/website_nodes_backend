const Item = require("../models/Item.model");
const {
  UNIVERSALIS_URL,
  PHANTASMAGORIA_MATS_JSON_PATH,
  DEFAULT_SERVER,
} = require("../src/constants");
const fetch = require("node-fetch");
const fs = require("fs").promises;

// const itemUpdates = [];
// Item.find()
//   .then((items) => {
//     for (let item of items) {
//       const itemTime = new Date(item.updatedAt);
//       if (Date.now() > itemTime.getTime() + ITEM_TTL * 1000) {
//         console.log("Updating: " + item.name);
//         itemUpdates.push(ItemHelper.updateItem(item));
//       }
//     }
//   })
//   .then(() => {
//     Promise.all(itemUpdates)
//       .then(() => Item.find())
//       .then((items) => res.json(items))
//       .catch((err) => res.status(400).json("Error: " + err));
//   })
//   .catch((err) => res.status(400).json("Error: " + err));

// async function getItems(...servers) {
//   Item.find().then((items) => { items = items.map((item) => item.)
//     const getItemPromises = servers.map((server) => {
//       new Promise((resolve, reject) => {
//         resolve(Item.find().then((items) => items)); //TODO
//       });
//     });
//   });
//   return Promise.all(getItemPromises);
// }

/**
 * Add an item to the database.
 * Does nothing if an item with that name already exists in the database.
 *
 * @param {string} itemName The name of the item to add to the database
 * @returns {Promise<string>} A promise, the value of which will be a string indicating success or failure.
 */
async function addItem(itemName, server = DEFAULT_SERVER) {
  let items;
  return fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => {
      //console.log(data);
      items = JSON.parse(data);
      if (!Object.keys(items).includes(itemName)) {
        return `Invalid item name: ${itemName}`; //TODO this should probably be an error
      }
      return Item.find({ name: itemName });
    })
    .then((savedItems) => {
      //console.log(savedItems);
      if (savedItems.length > 0) {
        return `Item "${itemName}" already exists in database.`;
      } else {
        return fetch(
          `${UNIVERSALIS_URL + server}/${items[itemName].universalisId}`
        )
          .then((response) => response.text())
          .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"])
          .then((price) => {
            const item = new Item({
              name: itemName,
              servers: { CerberusPrice: price },
              universalisId: items[itemName].universalisId,
            });
            return item
              .save()
              .then(() => `Item "${itemName}" saved.`)
              .catch((err) => `Could not save "${itemName}": ${err}`);
          });
      }
    });
}

/**
 * Ensure that all the items in PHANTASMAGORIA_MATS_JSON are in the items collection
 *
 * @returns {Promise} A promise that runs the function code. You may wish to add a catch after it.
 */
async function addAllItems() {
  const requiredItemNames = [];
  const presentItemNames = [];
  return await fs
    .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
    .then((data) => JSON.parse(data))
    .then((json) => {
      for (let itemName of Object.keys(json)) {
        requiredItemNames.push(itemName);
      }
      //console.log(`Required Items: ${requiredItemNames}`);
    })
    .then(() => Item.find())
    .then((items) => {
      for (let item of items) {
        presentItemNames.push(item.name);
      }
      //console.log(`Present items: ${presentItemNames}`);
    })
    .then(() => {
      const nonPresentItemNames = requiredItemNames.filter((itemName) => {
        console.log(
          `Is ${itemName} in presentItemNames?: ${presentItemNames.includes(
            itemName
          )}`
        );
        return !presentItemNames.includes(itemName);
      });
      //console.log(`Non-present items: ${nonPresentItemNames}`);

      for (let itemName of nonPresentItemNames) {
        //console.log(`Adding item: ${itemName}`);
        addItem(itemName).then((response) => console.log(response));
      }
    });
}

/**
 * Update the database entry for a given item and server
 *
 * @param {Document} item The item to update
 * @returns {Promise} a promise that runs the function code
 */
async function updateItem(item, ...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return Promise.all(
    servers.map((server) =>
      fetch(`${UNIVERSALIS_URL + server}/${item.universalisId}`)
        .then((response) => response.text())
        .then((body) => {
          item.updatedAt = Date.now().toString();
          console.log(item.updatedAt);
          item.price = JSON.parse(body)["listings"][0]["pricePerUnit"];
          return item.save().then(() => item);
        })
    )
  );
}

/**
 * Update all of the items in the items collection for the given server
 *
 * @returns A promise that runs the function code.
 */
async function updateAllItems(...servers) {
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }

  return Item.find().then((items) =>
    items.map((item) => updateItem(item, servers))
  );
}

// function updateAll() {
//   return new Promise((resolve, reject) => {
//     const update = function (err, data) {
//       if (err) {
//         console.log(`Couldn't read file: ${err}`);
//         reject(err);
//         return;
//       }
//       const items = JSON.parse(data);
//       const itemNames = Object.keys(items);

//       //An array of promises, the value of each is the lowest price for the item it was mapped from.
//       const itemPricePromises = Object.keys(items).map((item) =>
//         fetch(UNIVERSALIS_URL + items[item].universalisId)
//           .then((response) => response.text())
//           .then((body) => JSON.parse(body)["listings"][0]["pricePerUnit"])
//           .catch((err) => {
//             console.log(`Rejected: ${err}`);
//             reject(`ItemPricePromises error: ${err}`);
//           })
//       );

//       Promise.all(itemPricePromises)
//         .then((itemPrices) => {
//           console.log(itemPrices);
//           const itemNamesToPrices = {};
//           for (let i = 0; i < itemPrices.length; i++) {
//             itemNamesToPrices[itemNames[i]] = itemPrices[i];
//           }
//           return itemNamesToPrices;
//         })
//         .then((itemNamesToPrices) => {
//           const errors = {};

//           const itemSavingPromises = itemNames.map((itemName) => {
//             const itemPrice = itemNamesToPrices[itemName];
//             const itemUniversalisId = items[itemName].universalisId;

//             const promise = Item.where({ name: itemName })
//               .findOne()
//               .then((err, item) => {
//                 if (err) {
//                   console.log(`Unable to find ${itemName}: ${err}`);
//                 } else {
//                   if (item) {
//                     console.log(`${item} Found`);
//                     item.price = itemPrice;
//                   } else {
//                     item = new Item({
//                       name: itemName,
//                       universalisId: itemUniversalisId,
//                     });
//                   }
//                   //console.log(item.Chaos.CerberusPrice)
//                   item.save().catch((err) => {
//                     console.log(`Rejected. Unable to save ${itemName}: ${err}`);
//                     errors[itemName] = err;
//                   });
//                 }
//               })
//               .catch((err) => {
//                 console.log(`Unexpected error occured when saving ${itemName}`);
//                 errors[itemName] = err;
//               });

//             return promise;
//           });

//           Promise.all(itemSavingPromises)
//             .then(() => {
//               console.log(errors);
//               const unsavedItems = Object.keys(errors);
//               let resolveMessage = "Updating complete.";
//               if (unsavedItems.length > 0) {
//                 resolveMessage += `Unable to update the following: ${unsavedItems}`;
//               }

//               resolve(resolveMessage);
//             })
//             .catch((err) => {
//               console.log(`Rejected: ${err}`);
//               reject(`Saving error: ${err}`);
//             });
//         });
//     };

//     fs.readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8", update);
//   });
// }

const functionsBundle = { updateItem, updateAllItems, addItem, addAllItems };

module.exports = functionsBundle;
