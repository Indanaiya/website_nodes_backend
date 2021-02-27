"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_TTL = exports.DEFAULT_SERVER = exports.GATHERING_NODES_JSON_PATH = exports.GATHERABLE_ITEMS_JSON_PATH = exports.PHANTASMAGORIA_MATS_JSON_PATH = exports.UNIVERSALIS_URL = exports.SERVERS = exports.DATACENTERS = void 0;
exports.DATACENTERS = {
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
exports.SERVERS = Object.keys(exports.DATACENTERS).reduce((result, currentValue) => [...exports.DATACENTERS[currentValue], ...result], []);
exports.UNIVERSALIS_URL = "https://universalis.app/api/";
exports.PHANTASMAGORIA_MATS_JSON_PATH = "res/phantasmagoriaMats.json";
exports.GATHERABLE_ITEMS_JSON_PATH = "res/gatherableItems.json";
exports.GATHERING_NODES_JSON_PATH = "res/gatheringNodes.json";
exports.DEFAULT_SERVER = "Cerberus";
exports.ITEM_TTL = 24 * 60 * 60; //Minutes
//# sourceMappingURL=constants.js.map