"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AethersandItem = exports.GatherableItem = exports.PhantaItem = void 0;
const mongoose = require("mongoose");
const constants_js_1 = require("../src/constants.js");
const marketInfoForSchema = {};
for (let server of constants_js_1.SERVERS) {
    marketInfoForSchema[server] = {
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
            type: String,
        },
    };
}
const protoItemSchema = {
    name: {
        type: String,
        required: true,
        unique: true,
    },
    marketInfo: marketInfoForSchema,
    universalisId: {
        type: Number,
        required: true,
        unique: true,
    },
};
const phantaItemSchema = new mongoose.Schema(Object.assign({ tomestonePrice: { type: Number } }, protoItemSchema));
//TODO make a lot of these required once I've finished testing it
const gatherableItemSchema = new mongoose.Schema(Object.assign({ task: {
        aetherialReduce: { type: [], default: undefined },
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
    }, patch: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
    } }, protoItemSchema));
const aethersandItemSchema = new mongoose.Schema(Object.assign({ icon: { type: String } }, protoItemSchema));
exports.PhantaItem = mongoose.model("PhantaItem", phantaItemSchema);
exports.GatherableItem = mongoose.model("GatherableItem", gatherableItemSchema);
exports.AethersandItem = mongoose.model("AethersandItem", aethersandItemSchema);
//# sourceMappingURL=Item.model.js.map