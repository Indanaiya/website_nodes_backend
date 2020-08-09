const DATACENTERS = {
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
const SERVERS = Object.keys(DATACENTERS).reduce(
  (result, currentValue) => [...DATACENTERS[currentValue], ...result],
  []
);

const UNIVERSALIS_URL = "https://universalis.app/api/";
const PHANTASMAGORIA_MATS_JSON_PATH = "res/phantasmagoriaMats.json";
const DEFAULT_SERVER = "Cerberus";

module.exports = {
  DATACENTERS,
  SERVERS,
  UNIVERSALIS_URL,
  PHANTASMAGORIA_MATS_JSON_PATH,
  DEFAULT_SERVER,
};
