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

//console.log(protoItemSchema);

const phantaMatSchema = new Schema({
  tomestonePrice: { type: Number },
  ...protoItemSchema,
});

const PhantaItem = mongoose.model("PhantaItem", phantaMatSchema);

module.exports = {PhantaItem};
