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
    }
  };
}

//console.log(protoItemSchema);

const itemSchema = new Schema(protoItemSchema);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
