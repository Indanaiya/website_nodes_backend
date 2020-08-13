const mongoose = require("mongoose");
const { SERVERS } = require("../src/constants");

const Schema = mongoose.Schema;

const protoItemSchema = {
  name: {
    type: String,
    required: true,
    unique: true,
  },
  servers: {},
  universalisId: {
    type: Number,
    required: true,
    unique: true,
  },
};

for (let server of SERVERS) {
  protoItemSchema.servers[`${server}Price`] = {
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
