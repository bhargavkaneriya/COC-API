"use strict";
const config = require("./../../config");
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/product");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const dashboard = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const totalDealer = await query.countRecord(dbConstants.dbSchema.dealers, {});
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
        resolve({ totalDealer, totalTransaction });
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
        if (requestParam.status) {
          compareData = { ...compareData, status: requestParam.status }
        }
        const response = await query.selectWithAnd(dbConstants.dbSchema.dealers, compareData, { _id: 0, access_token: 0, password: 0 }, { created_at: -1 });
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

        let comparisonColumnsAndValues = { dealer_id: requestParam.dealer_id, type: requestParam.type }
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
              path: "$orderrDetail",
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
          dealer_id: requestParam.dealer_id,
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
              dealer_id: "$dealer_id",
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

        let comparisonColumnsAndValues = { dealer_id: requestParam.dealer_id }
        if (requestParam.search_key) {
          const searchTerm = requestParam.search_key;
          const regex = new RegExp(searchTerm, "i");
          comparisonColumnsAndValues = { ...comparisonColumnsAndValues, order_id: { $regex: regex } }
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
              from: "customers",
              localField: "customer_id",
              foreignField: "customer_id",
              as: "customerDetail",
            },
          },
          {
            $unwind: {
              path: "$customerDetail",
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
              customer_name: "$customerDetail.name",
              invoice_document: "https://drive.google.com/file/d/1DFZggrcP9bYD4hASxpsJ5OQtKfjdFrH5/view?usp=sharing"
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

const totalTopSalesProducts = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, dealer_id: 1 });
        if (!dealerData) {
          reject(errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound));
          return;
        }
        if (!(requestParam.type == "total_selling" || requestParam.type == "top_selling")) {
          reject(
            errors(labels.LBL_STATUS_INVALID["EN"], responseCodes.Invalid)
          );
          return;
        }
        let comparisonColumnsAndValues = {
          dealer_id: requestParam.dealer_id
        };

        let totalRecords = await query.countRecord(dbConstants.dbSchema.orders, comparisonColumnsAndValues);

        if (requestParam.type === "top_selling") {
          totalRecords = 5
        }

        const joinArr = [
          { $match: comparisonColumnsAndValues },
          {
            $group: {
              _id: { product_id: "$product_id" },
              "product_id": { "$first": "$product_id" },
              "name": { "$first": "$product_name" },
              "image": { "$first": "$product_image" },
              "qty": { $sum: "$product_qty" },
              "grand_total": { $sum: "$grand_total" },
            },
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              "product_id": "$product_id",
              "name": "$name",
              "image": "$image",
              "qty": "$qty",
              "grand_total": "$grand_total",
            },
          },
          {
            $limit: totalRecords
          }
        ];

        const product_list = await query.joinWithAnd(dbConstants.dbSchema.orders, joinArr);

        resolve(product_list);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const customerList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const requestCustomers = await query.selectWithAnd(
          dbConstants.dbSchema.requests,
          { dealer_id: requestParam.dealer_id },
          { _id: 0, customer_id: 1 }
        );

        const quationCustomers = await query.selectWithAnd(
          dbConstants.dbSchema.quotations,
          { dealer_id: requestParam.dealer_id },
          { _id: 0, customer_id: 1 }
        );

        let totalCustomer = requestCustomers.concat(quationCustomers);
        totalCustomer = _.uniq(_.pluck(totalCustomer, "customer_id"));

        const sizePerPage = requestParam.sizePerPage
          ? parseInt(requestParam.sizePerPage)
          : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = {
          customer_id: { $in: totalCustomer },
        };

        let totalRecords = await query.countRecord(
          dbConstants.dbSchema.customers,
          comparisonColumnsAndValues
        );
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(
            errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid)
          );
          return;
        }

        if (requestParam.search_key) {
          comparisonColumnsAndValues = {
            ...comparisonColumnsAndValues,
            name: requestParam.search_key,
          };
        }

        const joinArr = [
          {
            $match: comparisonColumnsAndValues,
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              customer_id: 1,
              name: 1,
              is_company: 1,
              company_name: 1,
              phone_number: 1,
              email: 1,
              gst_no: 1,
              pan_no: 1
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
          dbConstants.dbSchema.customers,
          joinArr
        );

        resolve({
          response_data: response,
          total_page
        });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const getBusinessProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          {
            dealer_id: requestParam.dealer_id,
          },
          {
            _id: 0,
            dealer_id: 1,
            business_name: 1,
            business_address: 1,
            state: 1,
            city: 1,
            pincode: 1,
            is_verified: 1,
            business_profile_status: 1,
            company_pan: 1,
            company_registration: 1,
            company_payment_details: 1,
            dealer_agreement_with_COC: 1,
            gst_certificate: 1,
            aadhar_card_of_director: 1
          }
        );
        resolve(resData);
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
  totalTopSalesProducts,
  customerList,
  getBusinessProfile
};