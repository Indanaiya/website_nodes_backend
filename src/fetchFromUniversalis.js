const fetch = require("node-fetch");

const { JSONParseError } = require("../src/errors");
const { UNIVERSALIS_URL, DEFAULT_SERVER } = require("../src/constants");

const sleep = require("util").promisify(setTimeout);

let fetching = false;

/**
 * Get market information for an item from universalis
 *
 * @param {string} universalisId The item id of the item that the market info is to be fetched for
 * @param {string} server The server that the market info is to be fetched for
 */
async function fetchFromUniversalis(universalisId, server = DEFAULT_SERVER) {
  const url = `${UNIVERSALIS_URL + server}/${universalisId}`;
  console.log(`Reading from ${url}`);
  // while (fetching) {
  //   await sleep(50);
  // }
  // fetching = true;
  //Get price
  const result = await fetch(url)
    .then((response) => response.text())
    .catch((err) => err)
    .then((body) => JSON.parse(body))
    .catch((err) => {
      console.log("Error reading JSON");
      throw new JSONParseError(
        `Error parsing json response from Universalis for item ${universalisId}: ${err}`
      );
    });
  // fetching = false;
  // await sleep(100);
  return result;
}

module.exports = fetchFromUniversalis;
