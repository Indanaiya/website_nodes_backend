const mongoose = require("mongoose");
const { SERVERS } = require("../src/constants");

const Schema = mongoose.Schema;

const protoItemSchema = {
  name: {
    type: String,
    required: true,
    unique: true,
  },
  marketInfo: {},
  id: {
    type: Number,
    required: true,
    unique: true,
  },
};

for (let server of SERVERS) {
  protoItemSchema.marketInfo[server] = {
    price: {
      type: Number,
      min: 1,
    },
    saleVelocity: {
      overall: {
        type: Number,
        min: 0,
      },
      nq: {
        type: Number,
        min: 0,
      },
      hq: {
        type: Number,
        min: 0,
      },
    },
    avgPrice: {
      overall: {
        type: Number,
        min: 0,
      },
      nq: {
        type: Number,
        min: 0,
      },
      hq: {
        type: Number,
        min: 0,
      },
    },
    lastUploadTime: {
      type: Date,
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
    aetherialReduce: {type: [], default:undefined},
    whiteScrips: {
      HighCollectability: Number,
      HighReward: Number,
      MidCollectability: Number,
      MidReward: Number,
      LowCollectability: Number,
      LowReward: Number,
    },
    yellowScrips: {
      HighCollectability: Number,
      HighReward: Number,
      MidCollectability: Number,
      MidReward: Number,
      LowCollectability: Number,
      LowReward: Number,
    },
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

const AethersandItem = mongoose.model("AethersandItem", protoItemSchema);

module.exports = { PhantaItem, GatherableItem, AethersandItem };
