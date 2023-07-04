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
  idGeneratorHandler,
} = require("xlcoreservice");
const errors = errorHandler;

const verifyPaymentDocument = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const orderData = await query.selectWithAndOne(dbConstants.dbSchema.orders, { order_id: requestParam.order_id }, { _id: 0, order_id: 1 });
        if (!orderData) {
          reject(
            errors(labels.LBL_INVALID_ORDER_ID["EN"], responseCodes.Invalid)
          );
          return;
        }
        let updatedata = { verify_document_status: requestParam.verify_document_status };
        if (requestParam.verify_document_status == "rejected") {
          updatedata = { ...updatedata, rejected_reason: requestParam.rejected_reason }
        }
        await query.updateSingle(dbConstants.dbSchema.orders, updatedata, { order_id: requestParam.order_id });
        resolve({ message: "Document status updated successfully" });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const orderList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        // const customer = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });
        // if (!customer) {
        //   reject(
        //     errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
        //   );
        //   return;
        // }

        const sizePerPage = requestParam.sizePerPage
          ? parseInt(requestParam.sizePerPage)
          : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let totalRecords = await query.countRecord(
          dbConstants.dbSchema.orders,
          {}
        );

        const total_page =
          totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);
        if (requestParam.page && requestParam.page > total_page) {
          reject(
            errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid)
          );
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
          // {
          //   $match: { customer_id: requestParam.customer_id, payment_method: requestParam.order_type },
          // },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              order_id: "$order_id",
              cart_id: "$cart_id",
              quotation_id: "$quotation_id",
              customer_id: "$customer_id",
              dealer_id: "$dealer_id",
              payment_method: "$payment_method",
              dealer_name: "$dealerDetail.name",
              name: "$product_name",
              qty: "$product_qty",
              image: "$product_image",
              price: "$product_price",
              total_price: "$total_price",
              grand_total: "$grand_total",
              verify_document_status: "$verify_document_status",
              delivery_status: "$delivery_status",
              order_created: "$created_at",
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
          dbConstants.dbSchema.orders,
          joinArr
        );
        resolve({
          response_data: response,
          total_page,
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


const verificationRequestList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const comparisonColumnsAndValues = { status: requestParam.status };

        let totalRecords = await query.countRecord(
          dbConstants.dbSchema.orders,
          comparisonColumnsAndValues
        );

        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);
        if (requestParam.page && requestParam.page > total_page) {
          reject(
            errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid)
          );
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
            $match: comparisonColumnsAndValues
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              order_id: "$order_id",
              cart_id: "$cart_id",
              quotation_id: "$quotation_id",
              customer_id: "$customer_id",
              dealer_id: "$dealer_id",
              payment_method: "$payment_method",
              dealer_name: "$dealerDetail.name",
              customer_name: "$customer_name",
              // name: "$product_name",
              // qty: "$product_qty",
              // image: "$product_image",
              // price: "$product_price",
              // total_price: "$total_price",
              // grand_total: "$grand_total",
              verify_document_status: "$verify_document_status",
              // delivery_status: "$delivery_status",
              order_created: "$created_at",
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
          dbConstants.dbSchema.orders,
          joinArr
        );
        resolve({
          response_data: response,
          total_page,
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

const verificationRequestDetail = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let response = await query.selectWithAndOne(
          dbConstants.dbSchema.orders,
          { order_id: requestParam.order_id },
          { _id: 0, order_id: 1, customer_name: 1, dealer_id: 1, quotation_id: 1, offline_payment_doc: 1 }
        );
        response = JSON.parse(JSON.stringify(response))
        const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: response.dealer_id }, { _id: 0, name: 1 });
        response = { ...response, dealer_name: dealerData.name }
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

const dealerDetail = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let response = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          { dealer_id: requestParam.dealer_id },
          { _id: 0, dealer_id: 1, name: 1, business_name: 1, business_address: 1, company_pan: 1, company_registration: 1, company_payment_details: 1, dealer_agreement_with_COC: 1, aadhar_card_of_director: 1 }
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

const verifyDealerDetail = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, dealer_id: 1 });
        if (!dealerData) {
          reject(
            errors(labels.LBL_INVALID_ORDER_ID["EN"], responseCodes.Invalid)
          );
          return;
        }
        let updatedata = { status: requestParam.status };
        if (requestParam.status == "rejected") {
          updatedata = { ...updatedata, rejected_reason: requestParam.rejected_reason }
        }
        await query.updateSingle(dbConstants.dbSchema.dealers, updatedata, { dealer_id: requestParam.dealer_id });
        resolve({ message: "Document updated successfully" });
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
  verifyPaymentDocument,
  orderList,
  verificationRequestList,
  verificationRequestDetail,
  dealerDetail,
  verifyDealerDetail
};