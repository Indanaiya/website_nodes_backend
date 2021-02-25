import mongoose from "mongoose";
const { Schema, model } = mongoose;
//TODO make a lot of these required once I've finished testing it
const gatheringNodeSchema = new Schema({
    items: { type: [Number], required: true, default: undefined },
    filters: {
        patch: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
        className: {
            type: String,
            required: true,
            enum: ["BTN", "MIN", "FSH"],
        },
        nodeType: {
            type: String,
            enum: ["unspoiled", "ephemeral", "legendary"],
        },
        task: {
            reducible: { type: Boolean, required: true },
            whiteScrips: { type: Boolean, required: true },
            yellowScrips: { type: Boolean, required: true },
        },
        tome: String,
    },
    location: {
        map: {
            type: String,
            required: true,
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
        type: [{ type: Number }],
        required: true,
        default: undefined,
    },
    lifespan: { type: Number, required: true },
    level: { type: Number, required: true, min: 1, max: 80 },
    name: { type: String },
});
export const GatheringNode = model("GatheringNode", gatheringNodeSchema);
//# sourceMappingURL=Node.model.js.map