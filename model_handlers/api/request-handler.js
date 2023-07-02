"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/request");
require("./../../models/customer");
require("./../../models/product");
require("./../../models/dealer_product");
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

        //notification add
        const notification_id = await idGeneratorHandler.generateId("COCN");
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, name: 1 });
        const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });

        let insertData = {
          notification_id,
          title: "request quotation to dealer",
          description: `${customerName.name} send request to ${dealerName.name}`,
          customer_id: requestParam.customer_id,
          dealer_id: requestParam.dealer_id,
          type:"dealer"
        }
        await query.insertSingle(dbConstants.dbSchema.notifications, insertData);
        //
        resolve({ message: "Requirement send successfully" });
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
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let compareData = {};
        if (requestParam.customer_id) {
          compareData = { ...compareData, customer_id: requestParam.customer_id }
        } else {
          compareData = { ...compareData, dealer_id: requestParam.dealer_id }
        }

        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.requests, compareData, { _id: 0 }, sizePerPage, page, { created_at: -1 });
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
        let reqDetails = await query.selectWithAndOne(
          dbConstants.dbSchema.requests,
          { request_id: requestParam.request_id },
          { _id: 0 }
        );
        const productDetails = await query.selectWithAndOne(dbConstants.dbSchema.products, { product_id: reqDetails.product_id }, { _id: 0, name: 1, image: 1 })
        const customerDetails = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: reqDetails.customer_id }, { _id: 0 })
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: reqDetails.dealer_id, product_id: reqDetails.product_id }, { _id: 0, dealer_product_id: 1, discount_percentage: 1, discount_amount: 1, price: 1 })
        reqDetails = JSON.parse(JSON.stringify(reqDetails))
        reqDetails.dealer_product_id = dealerProduct.dealer_product_id;
        reqDetails.discount_percentage = dealerProduct.discount_percentage;
        reqDetails.discount_amount = dealerProduct.discount_amount;
        reqDetails.product_price = dealerProduct.price;
        reqDetails.product_name = productDetails.name;
        reqDetails.product_image = productDetails.image;
        reqDetails.customer_name = customerDetails.name;
        reqDetails.request_date = reqDetails.created_at;
        resolve(reqDetails);
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
