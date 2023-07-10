"use strict";
const responseCodes = require("../../helpers/response-codes");
const express = require("express");
const router = express.Router();
const coreServices = require("xlcoreservice");
const jsonResponse = coreServices.jsonResponseHandler;
const productHandler = require("../../model_handlers/backend/product-handler.js");
const labels = require("./../../utils/labels.json");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

router.post("/create", async (req, res) => {
  try {
    if (!req.body.name) {
      jsonResponse(
        res,
        responseCodes.BadRequest,
        errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        null
      );
      return;
    }
    const response = await productHandler.create(req.body);
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

router.get("/list", async (req, res) => {
  try {
    // if (!req.body.name) {
    //   jsonResponse(
    //     res,
    //     responseCodes.BadRequest,
    //     errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
    //     null
    //   );
    //   return;
    // }
    const response = await productHandler.list(req.body);
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
