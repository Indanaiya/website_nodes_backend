"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const itemHelpers_js_1 = require("./src/itemHelpers.js");
const items_js_1 = require("./routes/items.js");
const nodes_js_1 = require("./routes/nodes.js");
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const PHANTASMAGORIA_MATS_JSON_PATH = "./res/phantasmagoriaMats.json";
const GATHERABLE_ITEMS_JSON_PATH = "./res/gatherableItems.json";
const GATHERING_NODES_JSON_PATH = "./res/gatheringNodes.json";
const AETHERSAND_JSON_PATH = "./res/aethersands.json";
function fillCollection(name, helper, dataPath) {
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
// Add documents to the database
fillCollection("Phantasmagoria Items", itemHelpers_js_1.phantasmagoriaItemHelper, PHANTASMAGORIA_MATS_JSON_PATH);
fillCollection("Gatherable Items", itemHelpers_js_1.gatherableItemHelper, GATHERABLE_ITEMS_JSON_PATH);
// aethersandItemHelper
// .addAllItems(AETHERSAND_JSON_PATH)
// .then(() => console.log("All athersand items present in collection."));
// Routes
app.use("/items", items_js_1.default);
app.use("/nodes", nodes_js_1.default);
// Start running
const httpServer = app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
//# sourceMappingURL=server.js.map