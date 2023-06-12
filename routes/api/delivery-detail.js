"use strict";
const responseCodes = require("../../helpers/response-codes");
const express = require("express");
const router = express.Router();
const coreServices = require("xlcoreservice");
const jsonResponse = coreServices.jsonResponseHandler;
const deliveryDetailHandler = require("../../model_handlers/api/delivery-detail-handler");
const labels = require("./../../utils/labels.json");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

router.post("/update-delivery-detail", async (req, res) => {
  try {
    if (!req.body.customer_id || !req.body.name || !req.body.phone_number || !req.body.email || !req.body.address || !req.body.state || !req.body.city || !req.body.pincode) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await deliveryDetailHandler.updateDeliveryDetail(req.body);
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

router.get("/get-delivery-detail", async (req, res) => {
  try {
    if (!req.query.customer_id) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await deliveryDetailHandler.getDeliveryDetail(req.query);
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