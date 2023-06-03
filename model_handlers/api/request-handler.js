"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/request");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const createRequest = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let request_id = await idGeneratorHandler.generateId("COCR");
        requestParam = { ...requestParam, request_id };
        await query.insertSingle(dbConstants.dbSchema.requests, requestParam);
        resolve({message:"Request created successfully"});
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const requestList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let compareData = {};
        if (requestParam.customer_id) {
          compareData = {...compareData,customer_id:requestParam.customer_id}
        } else {
          compareData = {...compareData,dealer_id:requestParam.dealer_id}
        }

        const response = await query.selectWithAnd(
          dbConstants.dbSchema.requests,
          compareData,
          { _id: 0 }
        );
        resolve(response);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const requestDetails = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const details = await query.selectWithAndOne(
          dbConstants.dbSchema.requests,
          { request_id: requestParam.request_id },
          { _id: 0 }
        );
        resolve(details);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

module.exports = {
  createRequest,
  requestList,
  requestDetails,
};
