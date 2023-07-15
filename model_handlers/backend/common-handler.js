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
const { sendSMS, sendPushNotification, sendEmail } = require("../../utils/common");
const errors = errorHandler;

const verifyPaymentDocument = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const orderData = await query.selectWithAndOne(dbConstants.dbSchema.orders, { order_id: requestParam.order_id }, { _id: 0, order_id: 1, quotation_id: 1, phone_number: 1 });
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

        const customerData = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: orderData.customer_id }, { _id: 0, customer_id: 1, name: 1, device_token: 1, email: 1 });

        if (requestParam.verify_document_status === "approved") {
          let message = `Dear Customer, Your offline/Bank payment of your order has been approved. Order id : ${orderData.order_id}`;

          if (orderData.quotation_id) {
            message = `Dear Customer, Your offline/Bank payment of your order has been approved. Order id : ${orderData.order_id} and Quote id : ${orderData?.quotation_id}`;
            await sendEmail({ toEmail: customerData.email, subject: "Verification", text: `Dear Customer, Your offline order has been successfully placed. Your payment verification is pending.  Our team will verify your offline payment and get back to you. Order id : ${orderData.order_id} and Quote id : ${orderData?.quotation_id}` });
          }
          await sendSMS(message, orderData.phone_number);
          await sendPushNotification({ tokens: [customerData.device_token], title: "Payment Verification", description: "Dear Customer, Your offline/bank payment verification has been successfully verified." });
        } else {
          let message = `Dear Customer, Your offline/Bank payment of your order has been rejected. Order id : ${orderData?.order_id}. Contact customer care : +91 9898989898 or mail : help@cementoncall.com`;
          if (orderData.quotation_id) {
            message = `Dear Customer, Your offline/Bank payment of your order has been rejected. Order id : ${orderData?.order_id} and Quote id : ${orderData?.quotation_id}. Contact customer care : +91 9898989898 or mail : help@cementoncall.com`;
          }
          await sendSMS(message, orderData.phone_number);
          await sendPushNotification({ tokens: [customerData.device_token], title: "Payment Verification", description: "Dear Customer, Your offline/bank payment verification has been rejected." });
        }
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
        const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, dealer_id: 1, device_token: 1, email: 1 });
        if (!dealerData) {
          reject(
            errors(labels.LBL_INVALID_ORDER_ID["EN"], responseCodes.Invalid)
          );
          return;
        }
        let updatedata = { status: requestParam.status };
        let message = `Dear valuable Dealer, Your request for listing your business on cement on call has been approved. Now you’re able to access your dealer dashboard`;
        let emailMessage = `Dear valuable Dealer, Your request for listing your business on cement on call has been approved. Now you’re able to access your dealer dashboard. Login your account : www.cementoncall.com/login`;

        if (requestParam.status == "rejected") {
          updatedata = { ...updatedata, rejected_reason: requestParam.rejected_reason }
          message = `Dear Dealer, Your request for listing your business on cement on call has been rejected.${requestParam.rejected_reason}`;
          emailMessage = `Dear Dealer, Your request for listing your business on cement on call has been rejected.${requestParam.rejected_reason}`;
        }
        await query.updateSingle(dbConstants.dbSchema.dealers, updatedata, { dealer_id: requestParam.dealer_id });

        await sendPushNotification({ tokens: [dealerData.device_token], title: "Verification", description: message });

        await sendEmail({ toEmail: dealerData.email, subject: "Verification", text: emailMessage });

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

const abandonedCartList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {

        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const totalRecords = await query.countRecord(dbConstants.dbSchema.carts, {});
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
            $match: {},
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              cart_id: "$cart_id",
              customer_id: "$customer_id",
              customer_name: "$customerDetail.name",
              dealer_id: "$dealer_id",
              dealer_name: "$dealerDetail.name",
              qty: "$qty",
              name: "$dealerProductDetail.name",
              discount_percentage: "$dealerProductDetail.discount_percentage",
              discount_amount: "$dealerProductDetail.discount_amount",
              price: "$dealerProductDetail.price"
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
          dbConstants.dbSchema.carts,
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

const quotationWaitingList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const requestList = await query.selectWithAnd(dbConstants.dbSchema.requests, {}, { _id: 0, request_id: 1 });
        const quotationList = await query.selectWithAnd(dbConstants.dbSchema.quotations, {}, { _id: 0, quotation_id: 1, request_id: 1 });
        let reqArr = [];
        requestList.filter((element) => {
          const even = _.find(quotationList, function (num) { return num.request_id !== element.request_id; });
          if (even) {
            reqArr.push(element.request_id)
          }
        });



        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const totalRecords = await query.countRecord(dbConstants.dbSchema.requests, { request_id: { $in: reqArr } });
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
              from: "products",
              localField: "product_id",
              foreignField: "product_id",
              as: "productDetail",
            },
          },
          {
            $unwind: {
              path: "$productDetail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: { request_id: { $in: reqArr } },
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $project: {
              _id: 0,
              request_id: "$request_id",
              customer_id: "$customer_id",
              customer_name: "$customerDetail.name",
              dealer_id: "$dealer_id",
              dealer_name: "$dealerDetail.name",
              qty: "$qty",
              product_name: "$productDetail.name",
              request_date: "$created_at"
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
          dbConstants.dbSchema.requests,
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

const sendNotification = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        requestParam.ids = JSON.parse(requestParam.ids);

        let modelName = dbConstants.dbSchema.customers;
        let compareData = {
          customer_id: { $in: requestParam.ids }
        }

        if (requestParam.type == "dealers") {
          modelName = dbConstants.dbSchema.dealers,
            compareData = {
              dealer_id: { $in: requestParam.ids }
            }
        }
        const response = await query.selectWithAnd(modelName, compareData, { _id: 0, device_token: 1 }, { created_at: -1 });
        const deviceTokens = _.pluck(response, 'device_token');
        await sendPushNotification({ tokens: deviceTokens, title: "Notification", description: requestParam.message });
        resolve({ message: "Send notification successfully" });
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
  verifyDealerDetail,
  abandonedCartList,
  quotationWaitingList,
  sendNotification
};