"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemNotFoundError = exports.IdenticalNodePresentError = exports.JSONParseError = exports.DBError = exports.InvalidArgumentError = void 0;
class InvalidArgumentError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidArgumentError";
    }
}
exports.InvalidArgumentError = InvalidArgumentError;
class DBError extends Error {
    constructor(message) {
        super(message);
        this.name = "DBError";
    }
}
exports.DBError = DBError;
class JSONParseError extends Error {
    constructor(message) {
        super(message);
        this.name = "JSONParseError";
    }
}
exports.JSONParseError = JSONParseError;
class IdenticalNodePresentError extends Error {
    constructor(message) {
        super(message);
        this.name = "IdenticalNodePresentError";
    }
}
exports.IdenticalNodePresentError = IdenticalNodePresentError;
class ItemNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "ItemNotFoundError";
    }
}
exports.ItemNotFoundError = ItemNotFoundError;
//# sourceMappingURL=errors.js.map