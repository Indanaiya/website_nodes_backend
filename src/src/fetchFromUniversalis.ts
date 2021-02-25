
import fetch from "node-fetch";
import { JSONParseError, ItemNotFoundError } from "../src/errors";
import { UNIVERSALIS_URL, DEFAULT_SERVER } from "../src/constants";

/**
 * Get market information for an item from universalis
 *
 * @param {string} universalisId The item id of the item that the market info is to be fetched for
 * @param {string} server The server that the market info is to be fetched for
 */
export default async function fetchFromUniversalis(universalisId: string | number, server: string = DEFAULT_SERVER) {
  const url = `${UNIVERSALIS_URL + server}/${universalisId}`;
  console.log(`Reading from ${url}`);

  const response = await fetch(url);
  const body = await response.text();
  const result = (() => {
    try {
      return JSON.parse(body);
    } catch (err) {
      console.log(`Error parsing JSON for ${universalisId}`, { body });
      if (body === "Not Found") {
        throw new ItemNotFoundError(
          `${universalisId} is not a valid item ID for universalis`
        );
      } else {
        throw new JSONParseError(
          `Error parsing json response from Universalis for item ${universalisId}: ${err}`
        );
      }
    }
  })();

  return result;
}
