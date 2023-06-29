"use strict";
var express = require("express");
var app = express();
const routes = require("./routes/index");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const coreServices = require("xlcoreservice");
const logger = coreServices.loggerHandler;
global.basedir = __dirname;

const mongoose = require("mongoose");
mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger("\n", "Database Connected Suceessfully", "\n");
  })
  .catch((error) => {
    logger("\n", "error while connectiong database!", "\n");
    logger(error);
  });

//routes

//backend
const productBackend = require("./routes/backend/product");
const commonBackend = require("./routes/backend/common");

//api
const auth = require("./routes/api/auth");
const dealer = require("./routes/api/dealer");
const quotation = require("./routes/api/quotation");
const request = require("./routes/api/request");
const customer = require("./routes/api/customer");
const cart = require("./routes/api/cart");
const order = require("./routes/api/order");
const deliveryDetail = require("./routes/api/delivery-detail");

//other configurations
const favicon = require("serve-favicon");
const multiparty = require("connect-multiparty");
const upload = require("express-fileupload");
const multipartyMiddleWare = multiparty();

//express configurations
app.disable("x-powered-by");
app.use(favicon(path.join(__dirname, "./public/img", "favicon.ico")));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(cors());
app.use(multipartyMiddleWare);

//route url define
app.use("/", routes);
//backend
app.use("/backend/product", productBackend);
app.use("/backend/common", commonBackend);


//api
app.use("/api/auth", auth);
app.use("/api/dealer", dealer);
app.use("/api/quotation", quotation);
app.use("/api/request", request);
app.use("/api/customer", customer);
app.use("/api/cart", cart);
app.use("/api/order", order);
app.use("/api/delivery-detail", deliveryDetail);

app.use(upload());

// catch 404 and forward to error handler
app.use(() => {
  logger("Error: No route found or Wrong method name");
});

if (app.get("env") === "development") {
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err,
    });
  });
}

// production error handler
// no stack traces leaked to user
app.use((err, req, res) => {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {},
  });
});

module.exports = app;