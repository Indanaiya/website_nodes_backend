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
  // filters: {
  //   patch: {
  //     type: Number,
  //     min: 1,
  //     max: 10,
  //   },
  //   class: {
  //     type: String,
  //     enum: ["BTN", "MIN", "FSH"],
  //   },
  //   nodeType: {
  //     type: String,
  //     enum: ["unspoiled", "ephemeral", "legendary"],
  //   },
  task: {
    reducible: String,
    whiteScrips: {type: [], default: undefined},
    yellowScrips: {type: [], default: undefined},
  },
  tome: String, //TODO could also be an enum
  // },
  // location: {
  //   map: {
  //     type: String,
  //     //TODO Could have an enum here, but it would be tedious and with little benefit
  //   },
  //   x: {
  //     type: Number,
  //     min: 0,
  //   },
  //   y: {
  //     type: Number,
  //     min: 0,
  //   },
  // },
  // spawnTimes: [{
  //   type: String,
  //   validate:{
  //     validator: (v) => /\d{2}:\d{2}/.test(v)
  //   }
  // }],
  ...protoItemSchema,
});

const PhantaItem = mongoose.model("PhantaItem", phantaItemSchema);

const GatherableItem = mongoose.model("GatherableItem", gatherableItemSchema);

module.exports = { PhantaItem, GatherableItem };
