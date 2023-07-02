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
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: requestParam.dealer_id, product_id: requestParam.product_id }, { _id: 0, dealer_product_id: 1 });
        requestParam = { ...requestParam, dealer_product_id: dealerProduct.dealer_product_id };
        await query.insertSingle(dbConstants.dbSchema.quotations, requestParam);
        await query.updateSingle(dbConstants.dbSchema.requests, { is_quotation_created: true }, { request_id: requestParam.request_id });
        //notification add
        const notification_id = await idGeneratorHandler.generateId("COCN");
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, name: 1 });
        const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });

        let insertData = {
          notification_id,
          title: "Quotation send to customer",
          description: `${dealerName.name} send quotation to ${customerName.name}`,
          customer_id: requestParam.customer_id,
          dealer_id: requestParam.dealer_id,
          type: "customer"
        }
        await query.insertSingle(dbConstants.dbSchema.notifications, insertData);
        //
        resolve({ message: "Quotation sent successfully" });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const updateQuotation = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const quaData = await query.selectWithAndOne(dbConstants.dbSchema.quotations, { quotation_id: requestParam.quotation_id }, { _id: 0, quotation_id: 1 });
        if (!quaData) {
          reject(
            errors(labels.LBL_INVALID_QUOTATION_ID["EN"], responseCodes.ResourceNotFound)
          );
          return;
        }
        const existQID = await query.selectWithAndOne(dbConstants.dbSchema.orders, { quotation_id: requestParam.quotation_id }, { _id: 0, order_id: 1, quotation_id: 1 });
        if (existQID) {
          reject(
            errors(labels.LBL_EXIST_QUOTATION_ID["EN"], responseCodes.Invalid)
          );
          return;
        }
        await query.updateSingle(dbConstants.dbSchema.quotations, { total_price: Number(requestParam.total_price), grand_total: Number(requestParam.grand_total), product_price: Number(requestParam.product_price) }, { quotation_id: requestParam.quotation_id });
        // send invoice
        resolve({ message: "Quoatation updated successfully" });
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
        const sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let compareData = {};
        if (requestParam.customer_id) {
          compareData = { ...compareData, customer_id: requestParam.customer_id };
        } else {
          compareData = { ...compareData, dealer_id: requestParam.dealer_id };
        }
        const response = await query.selectWithAndSortPaginate(dbConstants.dbSchema.quotations, compareData, { _id: 0 }, sizePerPage, page, { created_at: -1 });
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
        let quotationDetails = await query.selectWithAndOne(
          dbConstants.dbSchema.quotations,
          { quotation_id: requestParam.quotation_id },
          { _id: 0 }
        );

        const productDetails = await query.selectWithAndOne(dbConstants.dbSchema.products, { product_id: quotationDetails.product_id }, { _id: 0, name: 1, image: 1 })
        const customerDetails = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: quotationDetails.customer_id }, { _id: 0, name: 1 })
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: quotationDetails.dealer_id, product_id: quotationDetails.product_id }, { _id: 0, dealer_product_id: 1, discount_percentage: 1, discount_amount: 1, price: 1 })
        quotationDetails = JSON.parse(JSON.stringify(quotationDetails))
        quotationDetails.dealer_product_id = dealerProduct.dealer_product_id;
        quotationDetails.discount_percentage = dealerProduct.discount_percentage;
        quotationDetails.discount_amount = dealerProduct.discount_amount;
        quotationDetails.price = dealerProduct.price;
        quotationDetails.product_name = productDetails.name;
        quotationDetails.product_image = productDetails.image;
        quotationDetails.customer_name = customerDetails.name;
        quotationDetails.quotation_date = quotationDetails.created_at
        resolve(quotationDetails);
        return;
      } catch (error) {
        console.log("error", error);
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
  updateQuotation
};
