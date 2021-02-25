export class InvalidArgumentError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidArgumentError";
    }
}
export class DBError extends Error {
    constructor(message) {
        super(message);
        this.name = "DBError";
    }
}
export class JSONParseError extends Error {
    constructor(message) {
        super(message);
        this.name = "JSONParseError";
    }
}
export class IdenticalNodePresentError extends Error {
    constructor(message) {
        super(message);
        this.name = "IdenticalNodePresentError";
    }
}
export class ItemNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "ItemNotFoundError";
    }
}
//# sourceMappingURL=errors.js.map