"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateServers = void 0;
const constants_1 = require("./constants");
const errors_1 = require("./errors");
/**
 * Check that all servers are valid server names and returns them. If no server is provided, return an array containing the default server
 * @param servers Server names
 * @returns servers, or an array containing the default server name if servers is empty
 */
function validateServers(...servers) {
    servers.forEach((server) => {
        if (!constants_1.SERVERS.includes(server)) {
            throw new errors_1.InvalidArgumentError(`Server ${server} is not a valid server name`);
        }
    });
    if (servers.length === 0) {
        servers = [constants_1.DEFAULT_SERVER];
    }
    return servers;
}
exports.validateServers = validateServers;
//# sourceMappingURL=validateServers.js.map