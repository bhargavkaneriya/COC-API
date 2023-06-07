"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/quotation");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const createQuotation = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let quotation_id = await idGeneratorHandler.generateId("COCQ");
        requestParam = { ...requestParam, quotation_id };
        await query.insertSingle(dbConstants.dbSchema.quotations, requestParam);
        resolve({message:"Quotation sent successfully"});
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const quotationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let compareData = {};
        if (requestParam.customer_id) {
          compareData = {...compareData,customer_id: requestParam.customer_id};
        } else {
          compareData = { ...compareData, dealer_id: requestParam.dealer_id };
        }
        const response = await query.selectWithAnd(
          dbConstants.dbSchema.quotations,
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

const quotationDetails = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const quotationDetails = await query.selectWithAndOne(
          dbConstants.dbSchema.quotations,
          { quotation_id: requestParam.quotation_id },
          { _id: 0 }
        );

        const productDetails = await query.selectWithAndOne(dbConstants.dbSchema.products, {product_id:quotationDetails.product_id}, {_id:0, name:1, image:1})
        const customerDetails = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:quotationDetails.customer_id}, {_id:0})
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, {dealer_id:quotationDetails.dealer_id, product_id:quotationDetails.product_id}, {_id:0, dealer_product_id:1, discount_percentage:1, discount_amount:1, price: 1})
        reqDetails = JSON.parse(JSON.stringify(reqDetails))
        reqDetails.dealer_product_id = dealerProduct.dealer_product_id;
        reqDetails.discount_percentage = dealerProduct.discount_percentage;
        reqDetails.discount_amount = dealerProduct.discount_amount;
        reqDetails.price = dealerProduct.price;
        reqDetails.product_name = productDetails.name;
        reqDetails.product_image = productDetails.image;
        reqDetails.customer_name = customerDetails.name;

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
  createQuotation,
  quotationList,
  quotationDetails,
};
