const mongoose = require("mongoose");
const { DATACENTERS } = require("../src/constants");

const Schema = mongoose.Schema;

const serverPriceSchema = new Schema(
  { name: { type: String, required: true, unique: true } },
  { timestamps: true }
);

const datacenterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    servers: {
      type: [serverPriceSchema],
      default: undefined,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

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

const datacenters = Object.keys(DATACENTERS);
for (let datacenter of datacenters) {
  protoItemSchema.datacenters[datacenter] = {};
  for (let server of DATACENTERS[datacenter]) {
    protoItemSchema.datacenters[datacenter][`${server}Price`] = {
      type: Number,
    };
  }
}

const itemSchema = new Schema(protoItemSchema, {
  timestamps: true,
});

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
