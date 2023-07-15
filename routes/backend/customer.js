"use strict";
const responseCodes = require("../../helpers/response-codes");
const express = require("express");
const router = express.Router();
const coreServices = require("xlcoreservice");
const jsonResponse = coreServices.jsonResponseHandler;
const customerHandler = require("../../model_handlers/backend/customer-handler");
const labels = require("./../../utils/labels.json");
const { errorHandler } = require("xlcoreservice");
const errors = errorHandler;

router.get("/dashboard", async (req, res) => {
    try {
        const response = await customerHandler.dashboard(req.query);
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
        const response = await customerHandler.list(req.query);
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

router.get("/transaction-list", async (req, res) => {
    try {
        if (!req.query.customer_id || !req.query.type) {
            jsonResponse(
                res,
                responseCodes.BadRequest,
                errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
                null
            );
            return;
        }
        const response = await customerHandler.transactionList(req.query);
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
        if (!req.query.customer_id) {
            jsonResponse(
                res,
                responseCodes.BadRequest,
                errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
                null
            );
            return;
        }
        const response = await customerHandler.quotationList(req.query);
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

router.get("/invoice-list", async (req, res) => {
    try {
        console.log("req.query", req.query);
        if (!req.query.customer_id) {
            jsonResponse(
                res,
                responseCodes.BadRequest,
                errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
                null
            );
            return;
        }
        const response = await customerHandler.invoiceList(req.query);
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

router.get("/total-users", async (req, res) => {
    try {
        // if (!req.query.customer_id) {
        //     jsonResponse(
        //         res,
        //         responseCodes.BadRequest,
        //         errors(labels.LBL_MISSING_PARAMETERS["EN"], responseCodes.BadRequest),
        //         null
        //     );
        //     return;
        // }
        const response = await customerHandler.totalUsers(req.query);
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
