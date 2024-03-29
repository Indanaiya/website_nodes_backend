export const DATACENTERS: {[datacenter: string] : string[]} = {
  Aether: [
    "Adamantoise",
    "Cactuar",
    "Faerie",
    "Gilgamesh",
    "Jenova",
    "Midgardsormr",
    "Sargatanas",
    "Siren",
  ],
  Chaos: ["Cerberus", "Louisoix", "Moogle", "Omega", "Ragnarok", "Spriggan"],
  Crystal: [
    "Balmung",
    "Brynhildr",
    "Coeurl",
    "Diabolos",
    "Goblin",
    "Malboro",
    "Mateus",
    "Zalera",
  ],
  Elemental: [
    "Aegis",
    "Atomos",
    "Carbuncle",
    "Garuda",
    "Gungnir",
    "Kujata",
    "Ramuh",
    "Tonberry",
    "Typhon",
    "Unicorn",
  ],
  Gaia: [
    "Alexander",
    "Bahamut",
    "Durandal",
    "Fenrir",
    "Ifrit",
    "Ridill",
    "Tiamat",
    "Ultima",
    "Valefor",
    "Yojimbo",
    "Zeromus",
  ],
  Light: ["Lich", "Odin", "Phoenix", "Shiva", "Zodiark", "Twintania"],
  Mana: [
    "Anima",
    "Asura",
    "Belias",
    "Chocobo",
    "Hades",
    "Ixion",
    "Mandragora",
    "Masamune",
    "Pandaemonium",
    "Shinryu",
    "Titan",
  ],
  Primal: [
    "Behemoth",
    "Excalibur",
    "Exodus",
    "Famfrit",
    "Hyperion",
    "Lamia",
    "Leviathan",
    "Ultros",
  ],
};

//This is slower than writing out the arrays.
//But it's insignificant and this is less error prone, as only one variable has to be modified if the ffxiv server list is altered.
export const SERVERS: string[] = Object.keys(DATACENTERS).reduce(
  (result: string[], currentValue) => [...DATACENTERS[currentValue], ...result],
  []
);

export const UNIVERSALIS_URL = "https://universalis.app/api/";
export const PHANTASMAGORIA_MATS_JSON_PATH = "res/phantasmagoriaMats.json";
export const GATHERABLE_ITEMS_JSON_PATH = "res/gatherableItems.json";
export const GATHERING_NODES_JSON_PATH = "res/gatheringNodes.json";
export const DEFAULT_SERVER = "Cerberus";
export const ITEM_TTL = 24 * 60 * 60; //Minutes