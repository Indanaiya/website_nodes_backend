"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServers = void 0;
const constants_js_1 = require("../src/constants.js");
/**
 * Get the servers associated with serverOrDatacenter. Returns undefined if serverOrDatacenter is not a valid server or datacenter
 * @param serverOrDatacenter The name of a server or a datacenter
 */
function getServers(serverOrDatacenter) {
    let servers;
    if (Object.keys(constants_js_1.DATACENTERS).includes(serverOrDatacenter)) {
        servers = constants_js_1.DATACENTERS[serverOrDatacenter];
    }
    else if (constants_js_1.SERVERS.includes(serverOrDatacenter)) {
        servers = [serverOrDatacenter];
    }
    else {
        return undefined;
    }
    return servers;
}
exports.getServers = getServers;
//# sourceMappingURL=getServers.js.map