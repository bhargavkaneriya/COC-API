"use strict";
const responseCodes = require("../../helpers/response-codes");
const express = require("express");
const router = express.Router();
const coreServices = require("xlcoreservice");
const jsonResponse = coreServices.jsonResponseHandler;
const dealerHandler = require("../../model_handlers/api/dealer-handler");
const labels = require("./../../utils/labels.json");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

router.post("/product-add", async (req, res) => {
  try {
    if (!req.body.dealer_id && !req.body.product_id && !req.body.type) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await dealerHandler.productAdd(req.body);
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

router.get("/product-list", async (req, res) => {
  try {
    if (!req.query.dealer_id) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await dealerHandler.productList(req.query);
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

router.delete("/product-delete", async (req, res) => {
  try {
    if (!req.body.dealer_id && !req.body.product_id) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await dealerHandler.productDelete(req.body);
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

router.get("/customer-list", async (req, res) => {
  try {
    if (!req.query.dealer_id) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await dealerHandler.customerList(req.query);
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

router.get("/request-list", async (req, res) => {
  try {
    if (!req.query.dealer_id) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await dealerHandler.requestList(req.query);
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

router.get("/quotation-list", async (req, res) => {
  try {
    if (!req.query.dealer_id) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await dealerHandler.quotationList(req.query);
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

router.get("/common-product-list", async (req, res) => {
  try {
    const response = await dealerHandler.commonProductList(req.query);
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