const mongoose = require("mongoose");

const Schema = mongoose.Schema;

//TODO make a lot of these required once I've finished testing it
const gatheringNodeSchema = new Schema({
  items: { type: [String], required: true, default: undefined },
  filters: {
    patch: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    class: {
      type: String,
      required: true,
      enum: ["BTN", "MIN", "FSH"],
    },
    nodeType: {
      type: String,
      required: true,
      enum: ["unspoiled", "ephemeral", "legendary"],
    },
    task: {
      reducible: { type: Boolean, default: false },
      whiteScrips: { type: Boolean, default: false },
      yellowScrips: { type: Boolean, default: false },
    },
    tome: String,
  },
  location: {
    map: {
      type: String,
      required: true,
      //TODO Could have an enum here, but it would be tedious and with little benefit
    },
    x: {
      type: Number,
      required: true,
      min: 0,
    },
    y: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  spawnTimes: {
    type: [{ type: Number, min: 0, max: 24 }],
    required: true,
    default: undefined,
  },

  lifespan: { type: Number, required: true, min: 0, max: 24 },
});

const GatheringNode = mongoose.model("GatheringNode", gatheringNodeSchema);

module.exports = GatheringNode;
