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

const servers = Object.keys(SERVERS);
for (let server of servers) {
  protoItemSchema.servers[`${server}Price`] = {
    type: Number,
    min: 1,
  };
}

const itemSchema = new Schema(protoItemSchema, {
  timestamps: true,
});

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
