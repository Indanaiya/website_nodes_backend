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
const fetch = require("node-fetch");
const { JSONParseError, ItemNotFoundError } = require("../src/errors");
const { UNIVERSALIS_URL, DEFAULT_SERVER } = require("../src/constants");
/**
 * Get market information for an item from universalis
 *
 * @param {string} universalisId The item id of the item that the market info is to be fetched for
 * @param {string} server The server that the market info is to be fetched for
 */
function fetchFromUniversalis(universalisId, server = DEFAULT_SERVER) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${UNIVERSALIS_URL + server}/${universalisId}`;
        console.log(`Reading from ${url}`);
        const response = yield fetch(url);
        const body = yield response.text();
        const result = (() => {
            try {
                return JSON.parse(body);
            }
            catch (err) {
                console.log(`Error parsing JSON for ${universalisId}`, { body });
                if (body === "Not Found") {
                    throw new ItemNotFoundError(`${universalisId} is not a valid item ID for universalis`);
                }
                else {
                    throw new JSONParseError(`Error parsing json response from Universalis for item ${universalisId}: ${err}`);
                }
            }
        })();
        return result;
    });
}
module.exports = fetchFromUniversalis;
//# sourceMappingURL=fetchFromUniversalis.js.map