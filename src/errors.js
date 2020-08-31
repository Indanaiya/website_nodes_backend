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

module.exports = { InvalidArgumentError, DBError, JSONParseError };
