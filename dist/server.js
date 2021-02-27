"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const itemHelpers_js_1 = require("./src/itemHelpers.js");
const items_js_1 = require("./routes/items.js");
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const PHANTASMAGORIA_MATS_JSON_PATH = "./res/phantasmagoriaMats.json";
const GATHERABLE_ITEMS_JSON_PATH = "./res/gatherableItems.json";
const GATHERING_NODES_JSON_PATH = "./res/gatheringNodes.json";
const AETHERSAND_JSON_PATH = "./res/aethersands.json";
// Middleware
app.use(cors());
app.use(express.json());
// MongoDB
const uri = (_a = process.env.ATLAS_URI) !== null && _a !== void 0 ? _a : "";
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
        }
        else {
            closeServer = setTimeout(tick, 1000);
        }
    }, 0);
});
const connection = mongoose.connection;
connection.once("open", () => {
    console.log("MongoDB database connection established successfully");
});
//TODO make this into a function that I can call for every helper. e.g. callHelper(phantasmagoriaItemHelper, PHANTASMAGORIA_MATS_JSON_PATH): Promise<void>
// Add documents to the database
itemHelpers_js_1.phantasmagoriaItemHelper
    .addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
    .then((results) => {
    console.log("Phantasmagoria results:", results);
    console.log("Finished adding Phantasmagoria items to collection");
    results.forEach((result) => {
        if (result.status === "rejected") {
            console.log(result, `did not complete successfully`);
        }
    });
});
// gatherableItemHelper
//   .addAllItems(GATHERABLE_ITEMS_JSON_PATH)
//   .then(() => console.log("All gatherable items present in collection."))
//   .then(() => NodeHelper.addAllNodes(GATHERING_NODES_JSON_PATH))
//   .then(() => console.log("All gathering nodes present in collection"));
// aethersandItemHelper
//   .addAllItems(AETHERSAND_JSON_PATH)
//   .then(() => console.log("All athersand items present in collection."));
// Routes
app.use("/items", items_js_1.default);
// app.use("/nodes", nodesRouter);
// Start running
const httpServer = app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
//# sourceMappingURL=server.js.map