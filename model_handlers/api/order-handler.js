"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/order");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;
const { sendSMS } = require('../../utils/common');

const createOrder = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const customer = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1, phone_number: 1 });
        if (!customer) {
          reject(
            errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
          );
          return;
        }
        const deliveryDetail = await query.selectWithAndOne(dbConstants.dbSchema.delivery_detail, { delivery_detail: requestParam.delivery_detail }, { _id: 0 });
        if (!deliveryDetail) {
          reject(
            errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
          );
          return;
        }
        const cartDetail = await query.selectWithAndOne(dbConstants.dbSchema.carts, { cart_id: requestParam.cart_id }, { _id: 0 });
        if (!cartDetail) {
          reject(
            errors(labels.LBL_INVALID_CART_ID["EN"], responseCodes.ResourceNotFound)
          );
          return;
        }
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: cartDetail.dealer_id, product_id: cartDetail.product_id }, { _id: 0 });
        const order_id = await idGeneratorHandler.generateId("COCO");
        requestParam = {
          ...requestParam,
          order_id: order_id,
          customer_name: deliveryDetail.name,
          phone_number: deliveryDetail.phone_number,
          email: deliveryDetail.email,
          shipping_address: deliveryDetail.address,
          state: deliveryDetail.state,
          city: deliveryDetail.city,
          pincode: deliveryDetail.pincode,
          dealer_id: cartDetail.dealer_id,
          product_id: cartDetail.product_id,
          product_qty: cartDetail.qty,
          product_name: dealerProduct.name,
          product_price: dealerProduct.price,
          product_image: dealerProduct.image,
          product_discount_percentage: dealerProduct.discount_percentage,
          product_discount_amount: dealerProduct.discount_amount,
          payment_method: requestParam.payment_method,
        }
        if (requestParam.payment_method == "offline") {
          requestParam = { ...requestParam, offline_payment_doc: requestParam.offline_payment_doc, quotation_id: cartDetail.quotation_id }
        } else {
          requestParam = { ...requestParam, quotation_id: requestParam.quotation_id }
        }
        await query.insertSingle(dbConstants.dbSchema.orders, requestParam);

        //
        const transactionID = await idGeneratorHandler.generateId("COCT");
        let insertDataTxn = { transaction_id: transactionID, order_id, type: requestParam.payment_method, dealer_id: cartDetail.dealer_id, customer_id: cartDetail.customer_id };
        if (requestParam.payment_method == "online") {
          insertDataTxn = { ...insertDataTxn, razorpay_transaction_id: requestParam.razorpay_transaction_id }
        }
        await query.insertSingle(dbConstants.dbSchema.transactions, insertDataTxn);
        //

        //notification add
        const notification_id = await idGeneratorHandler.generateId("COCN");
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: cartDetail.dealer_id }, { _id: 0, name: 1 });
        const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });

        let insertData = {
          notification_id,
          title: "Order Placed",
          description: `${customerName.name} placed order to ${dealerName.name}`,
          customer_id: requestParam.customer_id,
          dealer_id: cartDetail.dealer_id,
          type: "dealer"
        }
        await query.insertSingle(dbConstants.dbSchema.notifications, insertData);
        //

        let message = `Dear Customer, Your order has been placed. Order id:${order_id}`;
        //
        if (requestParam.payment_method === "offline") {
          const notification_id = await idGeneratorHandler.generateId("COCN");
          const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });
          let insertData = {
            notification_id,
            title: "Order Placed",
            description: `${customerName.name} uploaded receipt`,
            customer_id: requestParam.customer_id,
            dealer_id: cartDetail.dealer_id,
            type: "dealer"
          }
          await query.insertSingle(dbConstants.dbSchema.notifications, insertData);
          message = `Dear Customer, Your order has been placed. Order id:${order_id} and Quote id : ${requestParam.quotation_id}`;
        }
        //

        await sendSMS(message, customer.phone_number);

        //
        await query.removeMultiple(dbConstants.dbSchema.carts, { cart_id: requestParam.cart_id });
        if (requestParam.payment_method == "offline") {
          await query.updateSingle(dbConstants.dbSchema.quotations, { is_deleted: true }, { quotation_id: requestParam.quotation_id });
        }
        //

        //start add invoice
        const invoice_id = await idGeneratorHandler.generateId("COCI");
        await query.insertSingle(dbConstants.dbSchema.invoices, { invoice_id, customer_id: requestParam.customer_id, dealer_id: cartDetail.dealer_id, order_id, invoice_document: "https://drive.google.com/file/d/1DFZggrcP9bYD4hASxpsJ5OQtKfjdFrH5/view?usp=sharing" });
        //end invoice

        resolve({ order_id, message: "Order created successfully" });
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
        const customer = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });
        if (!customer) {
          reject(
            errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.ResourceNotFound)
          );
          return;
        }

        const sizePerPage = requestParam.sizePerPage
          ? parseInt(requestParam.sizePerPage)
          : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let totalRecords = await query.countRecord(
          dbConstants.dbSchema.orders,
          { customer_id: requestParam.customer_id, payment_method: requestParam.order_type }
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
          {
            $match: { customer_id: requestParam.customer_id, payment_method: requestParam.order_type },
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

module.exports = {
  createOrder,
  orderList
};
