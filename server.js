"use strict";

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI;
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .catch((err) => {
    console.log("Failed to connect to MongoDB Atlas: " + err);

    let closeServer = setTimeout(function tick() {
      if (httpServer !== undefined) {
        httpServer.close();
      } else {
        closeServer = setTimeout(tick, 1000);
      }
    }, 0);
  });
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

const itemsRouter = require("./routes/items");

app.use("/items", itemsRouter);

const httpServer = app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
