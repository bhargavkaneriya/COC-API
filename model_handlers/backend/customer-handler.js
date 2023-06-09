"use strict";
const config = require("./../../config");
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/product");
const _ = require("underscore");
const {
  errorHandler,
} = require("xlcoreservice");
const errors = errorHandler;

const dashboard = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const totalCustomer = await query.countRecord(dbConstants.dbSchema.customers, {});
        const joinArr = [
          // { $match: { dealer_id: requestParam.dealer_id } },
          {
            $group:
            {
              _id: null,
              total: { $sum: "$grand_total" }
            }
          },
          {
            $project: {
              _id: "$_id",
              total: "$total"
            }
          }
        ];
        let totalTransaction = await query.joinWithAnd(dbConstants.dbSchema.orders, joinArr);
        totalTransaction = totalTransaction[0].total
        const totalRequest = await query.countRecord(dbConstants.dbSchema.requests, {});
        const totalOrders = await query.countRecord(dbConstants.dbSchema.orders, {});
        const totalQuotationWaitList = await query.countRecord(dbConstants.dbSchema.quotations, {}); //remaining confirmkrvu
        const totalAbandonedCart = await query.countRecord(dbConstants.dbSchema.carts, {}); //remaining confirmkrvu
        resolve({ totalCustomer, totalTransaction, totalRequest, totalOrders, totalQuotationWaitList, totalAbandonedCart });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const list = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const response = await query.selectWithAnd(dbConstants.dbSchema.customers, {}, { _id: 0, access_token: 0, password: 0 }, { created_at: -1 });
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

const transactionList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = { customer_id: requestParam.customer_id, type: requestParam.type }
        const totalRecords = await query.countRecord(dbConstants.dbSchema.transactions, comparisonColumnsAndValues);
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
        }

        const joinArr = [
          {
            $lookup: {
              from: "orders",
              localField: "order_id",
              foreignField: "order_id",
              as: "orderDetail",
            },
          },
          {
            $unwind: {
              path: "$orderDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "dealers",
              localField: "dealer_id",
              foreignField: "dealer_id",
              as: "dealerDetail",
            },
          },
          {
            $unwind: {
              path: "$dealerDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              transaction_id: "$transaction_id",
              order_id: "$order_id",
              cart_id: { $arrayElemAt: ["$orderDetail.cart_id", 0] },
              quotation_id: { $arrayElemAt: ["$orderDetail.quotation_id", 0] },
              customer_name: { $arrayElemAt: ["$orderDetail.customer_name", 0] },
              dealer_name: { $arrayElemAt: ["$dealerDetail.name", 0] },
              name: { $arrayElemAt: ["$orderDetail.product_name", 0] },
              image: { $arrayElemAt: ["$orderDetail.product_image", 0] },
              qty: { $arrayElemAt: ["$orderDetail.product_qty", 0] },
              total_price: { $arrayElemAt: ["$orderDetail.total_price", 0] },
              grand_total: { $arrayElemAt: ["$orderDetail.grand_total", 0] },
              delivery_status: { $arrayElemAt: ["$orderDetail.delivery_status", 0] },
              transaction_date: "$created_at",
              offline_payment_doc: { $arrayElemAt: ["$orderDetail.offline_payment_doc", 0] }
            },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          }
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.transactions,
          joinArr
        );
        resolve({ response_data: response, total_page });
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

const quotationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }


        let comparisonColumnsAndValues = {
          customer_id: requestParam.customer_id,
          // is_deleted: false
        }

        const totalRecords = await query.countRecord(dbConstants.dbSchema.quotations, comparisonColumnsAndValues);
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
        }

        const joinArr = [
          {
            $lookup: {
              from: "dealers",
              localField: "dealer_id",
              foreignField: "dealer_id",
              as: "dealerDetail",
            },
          },
          {
            $unwind: {
              path: "$dealerDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "dealer_product",
              localField: "dealer_product_id",
              foreignField: "dealer_product_id",
              as: "dealerProductDetail",
            },
          },
          {
            $unwind: {
              path: "$dealerProductDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              quotation_id: "$quotation_id",
              dealer_id: "$dealer_id",
              product_id: "$product_id",
              customer_id: "$customer_id",
              dealer_product_id: "$dealer_product_id",
              product_price: "$product_price",
              qty: "$qty",
              total_price: "$total_price",
              grand_total: "$grand_total",
              product_name: "$dealerProductDetail.name",
              dealer_name: "$dealerDetail.name",
              quotation_date: "$created_at",
              product_image: "$dealerProductDetail.image",
              quotation_pdf: "https://drive.google.com/file/d/1JHacEfYcaTgaYzrkvUhL1okeRTzm8ssd/view?usp=sharing",
              delete_allowed: "$delete_allowed"
            },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          }
        ];
        let response = await query.joinWithAnd(
          dbConstants.dbSchema.quotations,
          joinArr
        );
        resolve({ response_data: response, total_page });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const invoiceList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = { customer_id: requestParam.customer_id };
        if (requestParam.search_key) {
          comparisonColumnsAndValues = { ...comparisonColumnsAndValues, order_id: requestParam.order_id }
        }

        const totalRecords = await query.countRecord(dbConstants.dbSchema.invoices, comparisonColumnsAndValues);
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
        }

        const joinArr = [
          {
            $lookup: {
              from: "dealers",
              localField: "dealer_id",
              foreignField: "dealer_id",
              as: "dealerDetail",
            },
          },
          {
            $unwind: {
              path: "$dealerDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              invoice_id: "$invoice_id",
              customer_id: "$customer_id",
              dealer_id: "$dealer_id",
              dealer_name: "$dealerDetail.name",
              invoice_document: "https://drive.google.com/file/d/1DFZggrcP9bYD4hASxpsJ5OQtKfjdFrH5/view?usp=sharing"
            },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.invoices,
          joinArr
        );
        resolve({ response_data: response, total_page });
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
  dashboard,
  list,
  transactionList,
  quotationList,
  invoiceList
};