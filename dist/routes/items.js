import express from "express";
import { phantasmagoriaItemHelper, gatherableItemHelper, } from "../src/itemHelpers.js";
import { getServers } from "./getServers.js";
/**
 * Handle a request by getting the items for the provided model and returning them
 * @param model The model to get items for
 * @param req The request object
 * @param res The response object
 */
function getItems(model, req, res) {
    var _a;
    const servers = (_a = getServers(req.params.serverOrDatacenter)) !== null && _a !== void 0 ? _a : [];
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
    .get((req, res) => getItems(phantasmagoriaItemHelper, req, res));
router
    .route("/gatherable/:serverOrDatacenter")
    .get((req, res) => getItems(gatherableItemHelper, req, res));
export default router;
//# sourceMappingURL=items.js.map