"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
const errors_js_1 = require("../src/errors.js");
const constants_js_1 = require("../src/constants.js");
/**
 * Get market information for an item from universalis
 *
 * @param {string} universalisId The item id of the item that the market info is to be fetched for
 * @param {string} server The server that the market info is to be fetched for
 */
function fetchFromUniversalis(universalisId, server = constants_js_1.DEFAULT_SERVER) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${constants_js_1.UNIVERSALIS_URL + server}/${universalisId}`;
        console.log(`Reading from ${url}`);
        const response = yield node_fetch_1.default(url);
        const body = yield response.text();
        const result = (() => {
            try {
                return JSON.parse(body);
            }
            catch (err) {
                console.log(`Error parsing JSON for ${universalisId}`, { body });
                if (body === "Not Found") {
                    throw new errors_js_1.ItemNotFoundError(`${universalisId} is not a valid item ID for universalis`);
                }
                else {
                    throw new errors_js_1.JSONParseError(`Error parsing json response from Universalis for item ${universalisId}: ${err}`);
                }
            }
        })();
        return result;
    });
}
exports.default = fetchFromUniversalis;
//# sourceMappingURL=fetchFromUniversalis.js.map