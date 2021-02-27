import * as express from "express";
import {
  ItemHelper,
  phantasmagoriaItemHelper,
  gatherableItemHelper,
} from "../src/itemHelpers.js";
import { getServers } from "./getServers.js";
import { IProtoItemBaseDocument, IProtoItem } from "../models/Item.model.js";


/**
 * Handle a request by getting the items for the provided model and returning them
 * 
 * @param model The model to get items for
 * @param req The request object
 * @param res The response object
 */
function getItems(
  model: ItemHelper<IProtoItemBaseDocument, IProtoItem>,
  req: express.Request,
  res: express.Response
) {
  const servers = getServers(req.params.serverOrDatacenter) ?? [];

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