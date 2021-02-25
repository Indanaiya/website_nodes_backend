import mongoose from "mongoose";
const { Schema, model } = mongoose;
import { SERVERS } from "../src/constants.js";
const marketInfoForSchema = {};
for (let server of SERVERS) {
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
    marketInfoForSchema,
    universalisId: {
        type: Number,
        required: true,
        unique: true,
    },
};
const phantaItemSchema = new Schema(Object.assign({ tomestonePrice: { type: Number } }, protoItemSchema));
//TODO make a lot of these required once I've finished testing it
const gatherableItemSchema = new Schema(Object.assign({ task: {
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
        //required: true,
        min: 1,
        max: 10,
    } }, protoItemSchema));
const aethersandItemSchema = new Schema(Object.assign({ icon: { type: String } }, protoItemSchema));
export const PhantaItem = model("PhantaItem", phantaItemSchema);
export const GatherableItem = model("GatherableItem", gatherableItemSchema);
export const AethersandItem = model("AethersandItem", aethersandItemSchema);
//# sourceMappingURL=Item.model.js.map