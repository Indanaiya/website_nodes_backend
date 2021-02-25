/* eslint-disable no-undef */
const assert = require("chai").assert;
const mongoose = require("mongoose");
const fs = require("fs").promises;

const {
  IdenticalNodePresentError,
  InvalidArgumentError,
} = require("../src/errors");
const GatheringNode = require("../models/Node.model");
const { addAllNodes, addNode, getAllNodes } = require("../src/nodeHelpers");

const GATHERING_NODES_JSON_PATH = "res/test/gatheringNodesTest.json";

require("dotenv").config();

const uri = process.env.ATLAS_URI;

const TEST_NODE_DETAILS = {
  location: {
    map: "JUST FOR TESTING",
    x: 26,
    y: 13,
  },
  items: ["Imperial Fern"],
  spawnTimes: [6, 18],
  lifespan: 2,
  filters: {
    patch: "5.0",
    className: "MIN",
    nodeType: "unspoiled",
  },
  level: 80,
  name: "Legendary Test Vegetation",
};

describe("test nodeHelpers", function () {
  before(async () => {
    return await Promise.all([
      mongoose
        .connect(uri, {
          useNewUrlParser: true,
          useCreateIndex: true,
          useUnifiedTopology: true,
        })
        .then(() => console.log("Connected to MongoDB Atlas"))
        .catch((err) => {
          console.log("Failed to connect to MongoDB Atlas: " + err);
          throw err;
        }),
      // (mats = await fs
      //   .readFile(matsJsonPath, "utf8")
      //   .then((json) => JSON.parse(json))),
      GatheringNode.deleteMany(),
    ]);
  });

  describe("test addNode", function () {
    it("should add a node to the collection", async function () {
      assert.equal((await GatheringNode.find()).length, 0);

      await addNode(TEST_NODE_DETAILS);
      const found = await GatheringNode.find();
      assert.equal(found.length, 1);
    });

    it("should not add the same node to the collection twice", async function () {
      const initialLength = (await GatheringNode.find()).length;
      await addNode(TEST_NODE_DETAILS)
        .then(() =>
          assert.fail("adding the same node twice did not raise an error")
        )
        .catch((err) => assert.instanceOf(err, IdenticalNodePresentError))
        .catch(); //To prevent an error inside a promise

      const laterLength = (await GatheringNode.find()).length;

      assert.equal(initialLength, laterLength);
    });

    it("will raise in InvalidArgumentError if given an invalid argument", async function () {
      await addNode({ filters: {}, location: {} }) //Without filters and map, a different error will be triggered first
        .then(() =>
          assert.fail("trying to pass an empty object as a node didn't fail")
        )
        .catch((err) => assert.instanceOf(err, InvalidArgumentError))
        .catch();
    });
  });

  describe("test addAllNodes", function () {
    let nodes;
    before(async function () {
      await Promise.all([
        GatheringNode.deleteMany(),
        (nodes = await fs
          .readFile(GATHERING_NODES_JSON_PATH, "utf8")
          .then((json) => JSON.parse(json))),
      ]);
    });

    it("should add all nodes in the json file to the collection", async function () {
      await addAllNodes(GATHERING_NODES_JSON_PATH);
      const presentNodes = await GatheringNode.find();
      assert.equal(presentNodes.length, nodes.length);
    });

    it("should not throw an error when attempting to add the same node twice", async function () {
      await addAllNodes(GATHERING_NODES_JSON_PATH);
    });

    it("should throw an error when attempting to add an invalid node", async function () {
      nodes[0].location = undefined;
      await addAllNodes(GATHERING_NODES_JSON_PATH, nodes) //Without filters and map, a different error will be triggered first
        .then(() =>
          assert.fail("trying to add an invalid array of nodes did not fail")
        )
        .catch((err) => assert.instanceOf(err, InvalidArgumentError))
        .catch();
    });
  });

  describe("test getAllNodes", async function () {
    it("gets all nodes", async function () {
      const funcResult = await getAllNodes();
      const mongResult = await GatheringNode.find();
      assert.equal(funcResult.length, mongResult.length);
    });
  });
});
