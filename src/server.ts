"use strict";

import * as express from "express";
import * as cors from "cors";
import * as mongoose from "mongoose";
import * as dotenv from "dotenv";

import {
  gatherableItemHelper,
  aethersandItemHelper,
  phantasmagoriaItemHelper,
  ItemHelper,
} from "./src/itemHelpers.js";
import NodeHelper from "./src/nodeHelpers.js";

import itemsRouter from "./routes/items.js";
import nodesRouter from "./routes/nodes.js";
import { IProtoItem, IProtoItemBaseDocument } from "./models/Item.model.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const PHANTASMAGORIA_MATS_JSON_PATH = "./res/phantasmagoriaMats.json";
const GATHERABLE_ITEMS_JSON_PATH = "./res/gatherableItems.json";
const GATHERING_NODES_JSON_PATH = "./res/gatheringNodes.json";
const AETHERSAND_JSON_PATH = "./res/aethersands.json";

function fillCollection<
  DocType extends IProtoItemBaseDocument,
  ItemType extends IProtoItem
>(name: string, helper: ItemHelper<DocType, ItemType>, dataPath: string) {
  helper
    .addAllItems(dataPath)
    .then((results) => {
      console.log(`${name} results:`, results);
      console.log(`Finished adding ${name} items to collection`);
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.log(result, `did not complete successfully`);
        }
      });
    });
}

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
const uri = process.env.ATLAS_URI ?? "";
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .catch((err) => {
    console.log("Failed to connect to MongoDB Atlas: " + err);

    // Repeatedly try to close the port until successful
    let closeServer = setTimeout(function tick() {
      if (httpServer !== undefined) {
        httpServer.close();
      } else {
        closeServer = setTimeout(tick, 1000);
      }
    }, 0);
  });

const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

// Add documents to the database
fillCollection("Phantasmagoria Items", phantasmagoriaItemHelper, PHANTASMAGORIA_MATS_JSON_PATH);
fillCollection("Gatherable Items", gatherableItemHelper, GATHERABLE_ITEMS_JSON_PATH)

// aethersandItemHelper
// .addAllItems(AETHERSAND_JSON_PATH)
// .then(() => console.log("All athersand items present in collection."));

// Routes
app.use("/items", itemsRouter);
app.use("/nodes", nodesRouter);

// Start running
const httpServer = app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
