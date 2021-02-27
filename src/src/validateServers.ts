import { DEFAULT_SERVER, SERVERS } from "./constants";
import { InvalidArgumentError } from "./errors";

/**
 * Check that all servers are valid server names and returns them. If no server is provided, return an array containing the default server
 * @param servers Server names
 * @returns servers, or an array containing the default server name if servers is empty
 */
export function validateServers(...servers: string[]): string[] {
  servers.forEach((server) => {
    if (!SERVERS.includes(server)) {
      throw new InvalidArgumentError(
        `Server ${server} is not a valid server name`
      );
    }
  });
  if (servers.length === 0) {
    servers = [DEFAULT_SERVER];
  }
  return servers;
}