const mongoose = require("mongoose");

const Schema = mongoose.Schema;

//Server list from https://xivapi.com/servers/dc with non japanese/european/american servers removed
const SERVERS = {
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

const protoItemSchema = {
  name: {
    type: String,
    required: true,
    unique: true,
  },
  datacenters: {},
  universalisId: {
    type: Number,
    required: true,
    unique: true,
  },
};

for (let dc of Object.keys(SERVERS)) {
  protoItemSchema.datacenters[dc] = {};
  for (let server of SERVERS[dc]) {
    protoItemSchema.datacenters[dc][server] = { type: Number };
  }
}

const itemSchema = new Schema(protoItemSchema, {
  timestamps: true,
});

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
