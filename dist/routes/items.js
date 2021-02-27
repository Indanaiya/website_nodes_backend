"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const itemHelpers_js_1 = require("../src/itemHelpers.js");
const getServers_js_1 = require("./getServers.js");
/**
 * Handle a request by getting the items for the provided model and returning them
 * @param model The model to get items for
 * @param req The request object
 * @param res The response object
 */
function getItems(model, req, res) {
    var _a;
    const servers = (_a = getServers_js_1.getServers(req.params.serverOrDatacenter)) !== null && _a !== void 0 ? _a : [];
    model
        .getItems(...servers)
        .then((response) => res.json(response))
        .catch((err) => res.status(400).json("Error: " + err));
}
const router = express.Router();
router.route("/").get((_, res) => {
    // TODO
    res.json("I'll add something here later I promise");
});
router
    .route("/phantasmagoria/:serverOrDatacenter")
    .get((req, res) => getItems(itemHelpers_js_1.phantasmagoriaItemHelper, req, res));
router
    .route("/gatherable/:serverOrDatacenter")
    .get((req, res) => getItems(itemHelpers_js_1.gatherableItemHelper, req, res));
exports.default = router;
//# sourceMappingURL=items.js.map