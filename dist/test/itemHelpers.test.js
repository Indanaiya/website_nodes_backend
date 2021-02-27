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
const errors_js_1 = require("../src/errors.js");
const PHANTASMAGORIA_MATS_JSON_PATH = "res/test/phantasmagoriaMatsTest.json";
const GATHERABLE_ITEMS_JSON_PATH = "res/test/gatherableItemsTest.json";
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
 * @param itemHelper
 */
function describeItemHelper(itemHelper, addItemArg) {
    describe("addItem", () => {
        test("adds an item to the collection and returns 2 when adding a new item to the collection", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);
            expect(yield itemHelper.addItem(addItemArg)).toEqual(2);
            //TODO test that the item saved has all of the expected values
            const phantaSearchResults = yield Item_model_js_1.PhantaItem.find();
            if (phantaSearchResults.length !== 1) {
                fail(`phantaSearchResult's length was not 1, it was ${phantaSearchResults.length}`);
            }
            else {
                console.log(phantaSearchResults);
            }
        }));
        test("adds an item to the collection and returns 0 when the item to be added to the collection is already present", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);
            expect(yield itemHelper.addItem(addItemArg)).toEqual(2);
            expect((yield Item_model_js_1.PhantaItem.find()).length).toEqual(1);
            expect(yield itemHelper.addItem(addItemArg)).toEqual(0);
            expect((yield Item_model_js_1.PhantaItem.find()).length).toEqual(1);
        }));
        test("adds an item to the collection and returns 1 when the item is present but information a different server is provided", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis
                .mockReturnValueOnce(generateUniversalisReturnValue(15))
                .mockReturnValueOnce(generateUniversalisReturnValue(10))
                .mockReturnValue(universalisReturnValueFive);
            expect(yield itemHelper.addItem(addItemArg)).toEqual(2);
            expect((yield Item_model_js_1.PhantaItem.find()).length).toEqual(1);
            expect(yield itemHelper.addItem(addItemArg, TEST_SERVER_NAME)).toEqual(1);
            const expectedCollectionValue = {
                marketInfo: {
                    Cerberus: generateMarketInfoReturnValue(15),
                    Moogle: generateMarketInfoReturnValue(10),
                },
                name: testItemName,
                universalisId: 27744,
                tomestonePrice: 5,
            };
            const collection = yield Item_model_js_1.PhantaItem.find();
            expect(collection[0]).toMatchObject(expectedCollectionValue);
            expect(collection.length).toEqual(1);
        }));
        test("Will propagate ItemNotFoundError from fetchFromUniversalis", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockImplementation(() => {
                throw new errors_js_1.ItemNotFoundError(`27744 is not a valid item ID for universalis`);
            });
            return expect(itemHelper.addItem(addItemArg)).rejects.toThrow(errors_js_1.ItemNotFoundError);
        }));
        test("Will propagate ItemNotFoundError from fetchFromUniversalis", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockImplementation(() => {
                throw new errors_js_1.JSONParseError(`Error parsing json response from Universalis for item 24474: Fake Error`);
            });
            return expect(itemHelper.addItem(addItemArg)).rejects.toThrow(errors_js_1.JSONParseError);
        }));
    });
    describe("addAllItems", () => {
        test("adds all items in a provided json to the collection", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockReturnValue(universalisReturnValueFive);
            const requiredItems = yield fs
                .readFile(PHANTASMAGORIA_MATS_JSON_PATH, "utf8")
                .then((data) => JSON.parse(data))
                .then((obj) => Object.keys(obj).map((itemName) => {
                return {
                    name: itemName,
                    universalisId: Number.parseInt(obj[itemName].universalisId),
                    tomestonePrice: Number.parseInt(obj[itemName].tomestonePrice),
                };
            }));
            yield itemHelper
                .addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
                .then((promises) => promises.forEach((promise) => {
                expect(promise.status).toEqual("fulfilled");
            }));
            const results = yield Item_model_js_1.PhantaItem.find();
            expect(results.length).toEqual(requiredItems.length);
            requiredItems.forEach((item) => {
                const matchingResult = results.filter((resultItem) => resultItem.universalisId === item.universalisId);
                expect(matchingResult.length).toEqual(1);
                expect(matchingResult[0]).toMatchObject(item);
            });
        }));
        test("displays the correct type of error when individual promises reject", () => __awaiter(this, void 0, void 0, function* () {
            fetchFromUniversalis.mockImplementation(() => {
                throw new errors_js_1.JSONParseError("");
            });
            const results = yield itemHelper.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH);
            expect(results.length).toBeGreaterThan(0);
            yield Promise.all(results.map((result) => __awaiter(this, void 0, void 0, function* () {
                Promise.all([
                    expect(result.status).toEqual("rejected"),
                    expect((yield result).reason).toBeInstanceOf(errors_js_1.JSONParseError),
                ]);
            })));
        }));
        test("individual promises reject when addItem throws any error", () => __awaiter(this, void 0, void 0, function* () {
            const addItemMock = jest.spyOn(itemHelper, "addItem");
            addItemMock.mockImplementation(() => __awaiter(this, void 0, void 0, function* () {
                throw new Error();
            }));
            const results = yield itemHelper.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH);
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
            const returnVal = yield expect(itemHelper.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)).rejects.toThrow(Error);
            readFileMock.mockRestore();
            return returnVal;
        }));
        // test("propogates an error from reading the database", async () => {
        //   const findMock = jest.spyOn(mongoose.Model, "find");
        //   findMock.mockImplementation(async () => {
        //     throw new MongoError("");
        //   });
        //   const returnVal = await expect(
        //     itemHelper.addAllItems(PHANTASMAGORIA_MATS_JSON_PATH)
        //   ).rejects.toThrow(MongoError);
        //   findMock.mockRestore();
        //   return returnVal;
        // });
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
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield Item_model_js_1.PhantaItem.deleteMany({});
        if ((yield Item_model_js_1.PhantaItem.find()).length !== 0) {
            throw new Error("Some items in the collection weren't deleted");
        }
    }));
    describeItemHelper(itemHelpers_js_1.phantasmagoriaItemHelper, {
        name: testItemName,
        universalisId: 27744,
        tomestonePrice: 5,
    });
});
//# sourceMappingURL=itemHelpers.test.js.map