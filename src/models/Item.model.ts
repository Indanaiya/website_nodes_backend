import * as mongoose from "mongoose";
import { SERVERS } from "../src/constants.js";

// TODO since these things are optional I think I need to make them possibly undefined or something?
export interface ServerPrices {
  price: number;
  saleVelocity: {
    overall: number;
    nq: number;
    hq: number;
  };
  avgPrice: {
    overall: number;
    nq: number;
    hq: number;
  };
  lastUploadTime: Date;
  updatedAt: string;
}

export interface IProtoItem {
  name: string;
  marketInfo?: { [serverName: string]: ServerPrices };
  universalisId: number;
}
//TODO need to look at the difference between Document and BaseDocument again
export interface IProtoItemBaseDocument extends IProtoItem, mongoose.Document {}

export interface IScrips {
  HighCollectability: number;
  HighReward: number;
  MidCollectability: number;
  MidReward: number;
  LowCollectability: number;
  LowReward: number;
}

export interface IPhantaItem extends IProtoItem {
  tomestonePrice: number;
}

export interface IGatherableItem extends IProtoItem {
  task: {
    aetherialReduce?: number[];
    whiteScrips?: IScrips;
    yellowScrips?: IScrips;
  };
  patch: number;
}

export interface IAethersandItem extends IProtoItem {
  icon: string;
}

export interface IPhantaItemBaseDocument extends IPhantaItem, mongoose.Document {}
export interface IGatherableItemBaseDocument
  extends IGatherableItem,
  mongoose.Document {}
export interface IAethersandItemBaseDocument
  extends IAethersandItem,
  mongoose.Document {}

const marketInfoForSchema: { [key: string]: any } = {};
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
  marketInfo: marketInfoForSchema,
  universalisId: {
    type: Number,
    required: true,
    unique: true,
  },
};

const phantaItemSchema = new mongoose.Schema({
  tomestonePrice: { type: Number },
  ...protoItemSchema,
});

//TODO make a lot of these required once I've finished testing it
const gatherableItemSchema = new mongoose.Schema({
  task: {
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
  },
  patch: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  ...protoItemSchema,
});

const aethersandItemSchema = new mongoose.Schema({
  icon: { type: String },
  ...protoItemSchema,
});

export const PhantaItem = mongoose.model<IPhantaItemBaseDocument>(
  "PhantaItem",
  phantaItemSchema
);
export const GatherableItem = mongoose.model<IGatherableItemBaseDocument>(
  "GatherableItem",
  gatherableItemSchema
);
export const AethersandItem = mongoose.model<IAethersandItemBaseDocument>(
  "AethersandItem",
  aethersandItemSchema
);
