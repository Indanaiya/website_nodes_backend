class InvalidArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}

class DBError extends Error {
  constructor(message) {
    super(message);
    this.name = "DBError";
  }
}

class JSONParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "JSONParseError";
  }
}

class IdenticalNodePresentError extends Error {
  constructor(message) {
    super(message);
    this.name = "IdenticalNodePresentError";
  }
}


class ItemNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "ItemNotFoundError";
  }
}


module.exports = { InvalidArgumentError, DBError, JSONParseError, IdenticalNodePresentError, ItemNotFoundError };
