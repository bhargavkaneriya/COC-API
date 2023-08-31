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
        const totalQuotationWaitList = await query.countRecord(dbConstants.dbSchema.requests, {is_quotation_created:false});
        const totalAbandonedCart = await query.countRecord(dbConstants.dbSchema.carts, {});
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
        let compareData = {};
        if (requestParam?.search_key) {
          const searchTerm = requestParam.search_key;
          const regex = new RegExp(searchTerm, "i");
          compareData = {
            ...compareData,
            $or: [
              { name: { $regex: regex } },
              { email: { $regex: regex } },
              { phone_number: { $regex: regex } },
              { pan_no: { $regex: regex } },
              { gst_no: { $regex: regex } }
            ]
          }
        }

        const response = await query.selectWithAnd(dbConstants.dbSchema.customers, compareData, { _id: 0, access_token: 0, password: 0 }, { created_at: -1 });
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
              quotation_id: "$orderDetail.quotation_id",
              customer_name: "$orderDetail.customer_name",
              dealer_id: "$dealerDetail.dealer_id",
              dealer_name: "$dealerDetail.name",
              business_name: "$dealerDetail.business_name",
              name: "$orderDetail.product_name",
              image:"$orderDetail.product_image",
              qty: "$orderDetail.product_qty",
              total_price: "$orderDetail.total_price",
              grand_total: "$orderDetail.grand_total",
              delivery_status: "$orderDetail.delivery_status",
              transaction_date: "$created_at",
              offline_payment_doc: "$orderDetail.offline_payment_doc",
              status:"$status"
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
        response.map((element)=>{
          element.image = config.aws.base_url + element.image
          element.offline_payment_doc = config.aws.base_url + element.offline_payment_doc
        })
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
              from: "dealer_products",
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
              business_name: "$dealerDetail.business_name",
              quotation_date: "$created_at",
              product_image: "$dealerProductDetail.image",
              quo_doc: "$quo_doc",
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
        response.map((element)=>{
          element.quo_doc = config.aws.base_url + element.quo_doc
          element.product_image = config.aws.base_url + element.product_image
        })
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
              business_name: "$dealerDetail.business_name",
              invoice_document: "$invoice_document"
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
        response.map((element) => {
          element.invoice_document = config.aws.base_url + element.invoice_document
        })
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

const totalUsers = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const orderData = await query.selectWithAnd(dbConstants.dbSchema.orders, {}, { _id: 0, customer_id: 1 });
        const userIds = _.pluck(orderData, 'customer_id');
        const response = await query.selectWithAnd(dbConstants.dbSchema.customers, { customer_id: { $in: userIds } }, { _id: 0, access_token: 0, password: 0 }, { created_at: -1 });
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

module.exports = {
  dashboard,
  list,
  transactionList,
  quotationList,
  invoiceList,
  totalUsers
};