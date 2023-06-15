"use strict";
const responseCodes = require("../../helpers/response-codes");
const express = require("express");
const router = express.Router();
const coreServices = require("xlcoreservice");
const jsonResponse = coreServices.jsonResponseHandler;
const orderHandler = require("../../model_handlers/api/order-handler");
const labels = require("./../../utils/labels.json");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

router.post("/create-order", async (req, res) => {
  try {
    if (!req.body.customer_id || !req.body.delivery_detail_id || !req.body.payment_method || !req.body.total_price || !req.body.grand_total || !req.body.transaction_id || !(req.body.cart_id || req.body.quotation_id)) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await orderHandler.createOrder(req.body);
    jsonResponse(res, responseCodes.OK, null, response);
  } catch (error) {
    console.log("error", error);
    try {
      jsonResponse(res, responseCodes.Conflict, error, null);
      return;
    } catch (err) {
      jsonResponse(res, responseCodes.InternalServer, err, null);
      return;
    }
  }
});

router.get("/order-list", async (req, res) => {
  try {
    if (!req.query.customer_id || !req.query.order_type) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await orderHandler.orderList(req.query);
    jsonResponse(res, responseCodes.OK, null, response);
  } catch (error) {
    console.log("error", error);
    try {
      jsonResponse(res, responseCodes.Conflict, error, null);
      return;
    } catch (err) {
      jsonResponse(res, responseCodes.InternalServer, err, null);
      return;
    }
  }
});

module.exports = router;