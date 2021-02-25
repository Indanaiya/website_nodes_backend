import { DATACENTERS, SERVERS } from "../src/constants.js";
/**
 * Get the servers associated with serverOrDatacenter. Returns undefined if serverOrDatacenter is not a valid server or datacenter
 * @param serverOrDatacenter The name of a server or a datacenter
 */
export function getServers(serverOrDatacenter: string): string[] | undefined {
  let servers;
  if (Object.keys(DATACENTERS).includes(serverOrDatacenter)) {
    servers = DATACENTERS[serverOrDatacenter];
  } else if (SERVERS.includes(serverOrDatacenter)) {
    servers = [serverOrDatacenter];
  } else {
    return undefined;
  }
  return servers;
}