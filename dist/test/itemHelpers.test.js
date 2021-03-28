"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const mockFunction_js_1 = require("./mockFunction.js");
jest.mock("../src/fetchFromUniversalis.js");
const fetchFromUniversalis_js_1 = require("../src/fetchFromUniversalis.js");
const fetchFromUniversalis = mockFunction_js_1.mockFunction(fetchFromUniversalis_js_1.default);
const itemHelpers_js_1 = require("../src/itemHelpers.js");
const Item_model_js_1 = require("../models/Item.model.js");
const PHANTASMAGORIA_MATS_JSON_PATH = "res/test/phantasmagoriaMatsTest.json";
const GATHERABLE_ITEMS_JSON_PATH = "res/test/gatherableItemsTest.json";
const AETHERSAND_ITEMS_JSON_PATH = "res/test/aethersandsTest.json";
const TEST_SERVER_NAME = "Moogle";
const TEST_SERVER_NAME_2 = "Anima";
const FAKE_SERVER_NAME = "1234";
const FAKE_SERVER_NAME_2 = "4321";
const testItemName = "Multifaceted Alumen";
const universalisReturnValueFive = generateUniversalisReturnValue(5);
/**
 * Create an object representing a pretend return value from universalis
 * @param value
 * @param lastUploadTime
 */
function generateUniversalisReturnValue(value, lastUploadTime = 1597591027779) {
    return Promise.resolve({
        listings: [{ pricePerUnit: value }],
        regularSaleVelocity: value,
        nqSaleVelocity: value,
        hqSaleVelocity: value,
        averagePrice: value,
        averagePriceNQ: value,
        averagePriceHQ: value,
        lastUploadTime,
    });
}
/**
 * Create a valid marketInfo object
 * @param value
 */
function generateMarketInfoReturnValue(value) {
    return {
        avgPrice: {
            hq: value,
            nq: value,
            overall: value,
        },
        lastUploadTime: new Date(1597591027779),
        price: value,
        saleVelocity: { hq: value, nq: value, overall: value },
    };
}
/**
 * Runs a full gamut of tests on an ItemHelpers object
 * @param itemHelper The object to be tested
 * @param testItem
 */
function describeItemHelper(testName, itemHelper, testItem, testModel, testJSONAddress) {
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield testModel.deleteMany({});
        if ((yield testModel.find()).length !== 0) {
            throw new Error("Some items in the collection weren't deleted");
        }
    }));
    describe(`${testName}: addItem`, () => {
        test("adds an item to the collection and returns addItemReturn.ADDED when that item wasn't already present", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);
            expect(yield itemHelper.addItem(testItem)).toEqual(itemHelpers_js_1.addItemReturn.ADDED);
            //TODO test that the item saved has all of the expected values
            const searchResults = yield testModel.find();
            if (searchResults.length !== 1) {
                fail(`searchResult's length was not 1, it was ${searchResults.length}`);
            }
            else {
                expect(searchResults[0]).toMatchObject(testItem);
            }
        }));
        test("adds an item to the collection and returns addItemReturn.ALREADY_PRESENT when the item to be added to the collection is already present", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);
            expect(yield itemHelper.addItem(testItem)).toEqual(itemHelpers_js_1.addItemReturn.ADDED);
            expect((yield itemHelper.model.find()).length).toEqual(1);
            expect(yield itemHelper.addItem(testItem)).toEqual(itemHelpers_js_1.addItemReturn.ALREADY_PRESENT);
            expect((yield itemHelper.model.find()).length).toEqual(1);
        }));
    });
    describe(`${testName}: addAllItems`, () => {
        test("adds all items in a provided json to the collection", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);
            /** The items expected to be added to the collection */
            const requiredItems = yield fs
                .readFile(testJSONAddress, "utf8")
                .then((data) => JSON.parse(data))
                .then((obj) => Object.keys(obj).map((itemName) => {
                const returnVal = {};
                // Ensures that the type is ItemType
                Object.keys(testItem).forEach((key) => (returnVal[key] = obj[itemName][key]));
                return returnVal;
            }));
            // Add all items to the collection and expect them to all be added successfully
            yield itemHelper.addAllItems(testJSONAddress).then((promises) => promises.forEach((promise) => {
                expect(promise.status).toEqual("fulfilled");
            }));
            const itemsInCollection = yield testModel.find();
            expect(itemsInCollection.length).toEqual(requiredItems.length);
            requiredItems.forEach((requiredItem) => {
                const matchingResult = itemsInCollection.filter((resultItem) => resultItem.universalisId === requiredItem.universalisId);
                expect(matchingResult.length).toEqual(1);
                expect(matchingResult[0]).toMatchObject(requiredItem);
            });
        }));
        test("individual promises reject when addItem throws any error", () => __awaiter(this, void 0, void 0, function* () {
            const addItemMock = jest.spyOn(itemHelper, "addItem");
            addItemMock.mockImplementation(() => __awaiter(this, void 0, void 0, function* () {
                throw new Error();
            }));
            const results = yield itemHelper.addAllItems(testJSONAddress);
            expect(results.length).toBeGreaterThan(0);
            yield Promise.all(results.map((result) => __awaiter(this, void 0, void 0, function* () {
                Promise.all([
                    expect(result.status).toEqual("rejected"),
                    expect((yield result).reason).toBeInstanceOf(Error),
                ]);
            })));
            addItemMock.mockRestore();
        }));
        test("Throws an error if it cannot read the json", () => __awaiter(this, void 0, void 0, function* () {
            const readFileMock = jest.spyOn(fs, "readFile");
            readFileMock.mockImplementation(() => __awaiter(this, void 0, void 0, function* () {
                throw new Error();
            }));
            const returnVal = yield expect(itemHelper.addAllItems(testJSONAddress)).rejects.toThrow(Error);
            readFileMock.mockRestore();
            return returnVal;
        }));
    });
}
describe("getMarketInfo", () => {
    test("calls fetchFromUniversalis for the supplied item id and server, then returns a ServerPrices object corresponding to the recieved information", () => __awaiter(void 0, void 0, void 0, function* () {
        expect.assertions(5);
        fetchFromUniversalis.mockImplementation((universalisId, server) => (universalisId === 5 || universalisId === "5") && server === "Cerberus"
            ? universalisReturnValueFive
            : fail("called fetchFromUniversalis with the incorrect parameters"));
        const time = Date.now();
        const { listings: { 0: { pricePerUnit }, }, regularSaleVelocity, nqSaleVelocity, hqSaleVelocity, averagePrice, averagePriceNQ, averagePriceHQ, lastUploadTime, } = yield universalisReturnValueFive;
        const marketInfo = yield itemHelpers_js_1.getMarketInfo(5, "Cerberus");
        expect(marketInfo.price).toEqual(pricePerUnit);
        expect(marketInfo.saleVelocity).toEqual({
            overall: regularSaleVelocity,
            nq: nqSaleVelocity,
            hq: hqSaleVelocity,
        });
        expect(marketInfo.avgPrice).toEqual({
            overall: averagePrice,
            nq: averagePriceNQ,
            hq: averagePriceHQ,
        });
        expect(marketInfo.lastUploadTime).toEqual(lastUploadTime);
        expect(Number.parseInt(marketInfo.updatedAt)).toBeGreaterThanOrEqual(time);
    }));
});
describe("itemHelpersTest", () => {
    let mongod;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        mongod = new mongodb_memory_server_1.MongoMemoryServer();
        yield mongoose
            .connect(yield mongod.getUri(), {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
        })
            .then(() => console.log("Mongoose connected to mongod"))
            .catch((err) => {
            console.log("Mongoose failed to connect to mongod: " + err);
            throw err;
        });
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose.disconnect();
        yield mongod.stop();
    }));
    describeItemHelper("phantasmagoria", itemHelpers_js_1.phantasmagoriaItemHelper, {
        name: testItemName,
        universalisId: 27744,
        tomestonePrice: 5,
    }, Item_model_js_1.PhantaItem, PHANTASMAGORIA_MATS_JSON_PATH);
    describeItemHelper("gatherableItem", itemHelpers_js_1.gatherableItemHelper, {
        name: "Beech Branch",
        universalisId: 19936,
        task: {
            yellowScrips: {
                HighCollectability: 500,
                MidCollectability: 470,
                LowCollectability: 450,
                HighReward: 15,
                MidReward: 13,
                LowReward: 12,
            },
        },
        patch: 5.3,
    }, Item_model_js_1.GatherableItem, GATHERABLE_ITEMS_JSON_PATH);
});
describeItemHelper("aethersandItem", itemHelpers_js_1.aethersandItemHelper, {
    "name": "Chiaroglow Aethersand",
    "universalisId": 27811,
    "icon": "/i/021000/021235.png"
}, Item_model_js_1.AethersandItem, AETHERSAND_ITEMS_JSON_PATH);
//# sourceMappingURL=itemHelpers.test.js.map