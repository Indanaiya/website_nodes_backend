const mongoose = require("mongoose");
const { SERVERS } = require("../src/constants");

const Schema = mongoose.Schema;

const protoItemSchema = {
  name: {
    type: String,
    required: true,
    unique: true,
  },
  prices: {},
  universalisId: {
    type: Number,
    required: true,
    unique: true,
  },
};

for (let server of SERVERS) {
  protoItemSchema.prices[server] = {
    price: {
      type: Number,
      min: 1,
    },
    updatedAt: {
      type: Date,
    },
  };
}

const phantaItemSchema = new Schema({
  tomestonePrice: { type: Number },
  ...protoItemSchema,
});

//TODO make a lot of these required once I've finished testing it
const gatherableItemSchema = new Schema({
  task: {
    reducible: String,
    whiteScrips: {type: [], default: undefined},
    yellowScrips: {type: [], default: undefined},
  },
  patch: {
    type: Number,
    //required: true,
    min: 1,
    max: 10,
  },
  ...protoItemSchema,
});

const PhantaItem = mongoose.model("PhantaItem", phantaItemSchema);

const GatherableItem = mongoose.model("GatherableItem", gatherableItemSchema);

module.exports = { PhantaItem, GatherableItem };
