"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/dealer");
require("./../../models/product");
require("./../../models/dealer_product");
require("./../../models/invoice");
require("./../../models/notification");
require("./../../models/transaction");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;

const productAdd = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealer = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          { dealer_id: requestParam.dealer_id },
          { _id: 0 }
        );
        if (!dealer) {
          reject(
            errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.Invalid)
          );
          return;
        }
        if (requestParam.type == "add") {
          const existProduct = await query.selectWithAndOne(
            dbConstants.dbSchema.dealer_product,
            {
              dealer_id: requestParam.dealer_id,
              product_id: requestParam.product_id,
            },
            { _id: 0 }
          );
          if (existProduct) {
            reject(
              errors(
                labels.LBL_PRODUCT_ALREADY_EXIST["EN"],
                responseCodes.Invalid
              )
            );
            return;
          }
          const dealer_product_id = await idGeneratorHandler.generateId(
            "COCDP"
          );
          await query.insertSingle(dbConstants.dbSchema.dealer_product, {
            dealer_product_id: dealer_product_id,
            dealer_id: requestParam.dealer_id,
            product_id: requestParam.product_id,
            name: requestParam.name,
            image: "tempString",
            code: requestParam.code,
            discount_percentage: requestParam.discount_percentage,
            discount_amount: requestParam.discount_amount,
            price: requestParam.price,
          });
          resolve({ message: "Product added successfully" });
          return;
        } else {
          await query.updateSingle(
            dbConstants.dbSchema.dealer_product,
            requestParam,
            { dealer_product_id: requestParam.dealer_product_id }
          );
          resolve({ message: "Product updated successfully" });
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const productList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage
          ? requestParam.sizePerPage
          : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const dealer = await query.selectWithAndSortPaginate(
          dbConstants.dbSchema.dealer_product,
          { dealer_id: requestParam.dealer_id },
          { _id: 0 },
          sizePerPage,
          page,
          { created_at: -1 }
        );

        resolve({
          response_data: dealer,
          total_page:
            dealer.length < 10 || dealer.length == 10
              ? 0
              : Math.ceil(dealer.length / sizePerPage),
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

const productDelete = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const dealer = await query.selectWithAndOne(
          dbConstants.dbSchema.dealer_product,
          { dealer_product_id: requestParam.dealer_product_id },
          { _id: 0 }
        );
        if (!dealer) {
          reject(
            errors(labels.LBL_INVALID_PRODUCT["EN"], responseCodes.Invalid)
          );
          return;
        }
        await query.removeMultiple(dbConstants.dbSchema.dealer_product, {
          dealer_product_id: requestParam.dealer_product_id,
        });
        resolve({ message: "Product deleted successfully" });
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
            $sort: { created_at: -1 },
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

const requestList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage
          ? parseInt(requestParam.sizePerPage)
          : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        let comparisonColumnsAndValues = {
          dealer_id: requestParam.dealer_id,
          is_quotation_created: false
        };

        let totalRecords = await query.countRecord(
          dbConstants.dbSchema.requests,
          comparisonColumnsAndValues
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
            $project: {
              _id: 0,
              request_id: "$request_id",
              customer_id: "$customer_id",
              request_date: "$created_at",
              customer_name: "$customerDetail.name",
            },
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.requests,
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

const quotationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage
          ? parseInt(requestParam.sizePerPage)
          : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }
        let comparisonColumnsAndValues = {
          dealer_id: requestParam.dealer_id,
        };

        let totalRecords = await query.countRecord(
          dbConstants.dbSchema.quotations,
          comparisonColumnsAndValues
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
            $project: {
              _id: 0,
              quotation_id: "$quotation_id",
              customer_id: "$customer_id",
              quotation_date: "$created_at",
              customer_name: "$customerDetail.name",
            },
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          },
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.quotations,
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

const commonProductList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const sizePerPage = requestParam.sizePerPage
          ? requestParam.sizePerPage
          : 10;
        let page = requestParam.page ? requestParam.page : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const resData = await query.selectWithAnd(
          dbConstants.dbSchema.products,
          { status: "active" },
          { _id: 0 },
          { created_at: -1 }
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

const getProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          {
            dealer_id: requestParam.dealer_id,
          },
          { _id: 0, dealer_id: 1, name: 1, phone_number: 1, email: 1 }
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

const updateBusinessProfile = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.dealers,
          {
            dealer_id: requestParam.dealer_id,
          },
          { _id: 0, dealer_id: 1 }
        );

        if (!resData) {
          reject(
            errors(labels.LBL_USER_NOT_FOUND["EN"], responseCodes.Invalid)
          );
          return;
        }

        await query.updateSingle(
          dbConstants.dbSchema.dealers,
          {
            business_name: requestParam.business_name,
            business_address: requestParam.business_address,
            state: requestParam.state,
            city: requestParam.city,
            pincode: requestParam.pincode,
            business_profile_status: "added",
            company_pan: requestParam.company_pan,
            company_registration: requestParam.company_registration,
            company_payment_details: requestParam.company_payment_details,
            dealer_agreement_with_COC: requestParam.dealer_agreement_with_COC,
            aadhar_card_of_director: requestParam.aadhar_card_of_director,
            gst_certificate: requestParam.gst_certificate,
          },
          { dealer_id: requestParam.dealer_id }
        );

        resolve({ message: "Profile details updated successfully" });
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }
    main();
  });
};

const notificationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {

        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const comparisonColumnsAndValues = { dealer_id: requestParam.dealer_id };
        const totalRecords = await query.countRecord(dbConstants.dbSchema.notifications, comparisonColumnsAndValues);
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
            $project: {
              _id: 0,
              notification_id: "$notification_id",
              customer_id: "$customer_id",
              dealer_id: "$dealer_id",
              title: "$title",
              description: "$description",
              type: "$type",
              status: "$status",
              notification_date: "$created_at",
              customer_name: "$customerDetail.name"
            },
          },
          {
            $sort: { created_at: -1 },
          },
          {
            $skip: page * sizePerPage,
          },
          {
            $limit: sizePerPage,
          }
        ];
        const response = await query.joinWithAnd(
          dbConstants.dbSchema.notifications,
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
            $sort: { created_at: -1 },
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

const updatedeliveryStatus = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(
          dbConstants.dbSchema.orders,
          {
            order_id: requestParam.order_id,
          },
          { _id: 0, order_id: 1, delivery_status: 1, dealer_id: 1, customer_id: 1 }
        );

        if (!resData) {
          reject(
            errors(labels.LBL_INVALID_ORDER_ID["EN"], responseCodes.Invalid)
          );
          return;
        }

        if (!(requestParam.delivery_status == "accepted" || requestParam.delivery_status == "pending" || requestParam.delivery_status == "in_transit" || requestParam.delivery_status == "delivered")) {
          reject(
            errors(labels.LBL_STATUS_INVALID["EN"], responseCodes.Invalid)
          );
          return;
        }

        if (requestParam.delivery_status === "accepted") {
          if (resData.delivery_status !== "pending") {
            reject(
              errors(`You can not update this status for this order.Because your order is ${resData.delivery_status}`, 402)
            );
            return;
          }
        } else if (requestParam.delivery_status === "in_transit") {
          if (resData.delivery_status !== "accepted") {
            reject(
              errors(`You can not update this status for this order.Because your order is ${resData.delivery_status}`, 402)
            );
            return;
          }
        } else if (requestParam.delivery_status === "delivered") {
          if (resData.delivery_status !== "in_transit") {
            reject(
              errors(`You can not update this status for this order.Because your order is ${resData.delivery_status}`, 402)
            );
            return;
          } else {
            const notification_id = await idGeneratorHandler.generateId("COCN");
            // const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: cartDetail.dealer_id }, { _id: 0, name: 1 });
            // const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });

            let insertData = {
              notification_id,
              title: "Order Delivered",
              description: `Your order is delivered`,
              customer_id: resData.customer_id,
              dealer_id: resData.dealer_id,
              type: "customer"
            }
            await query.insertSingle(dbConstants.dbSchema.notifications, insertData);
          }
        }

        await query.updateSingle(dbConstants.dbSchema.orders, { delivery_status: requestParam.delivery_status }, { order_id: requestParam.order_id });
        resolve({ message: "Delivery status updated successfully" });
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
            $project: {
              _id: 0,
              transaction_id: "$transaction_id",
              order_id: "$order_id",
              cart_id: "$orderDetail.cart_id",
              quotation_id: "$orderDetail.quotation_id",
              customer_name: "$orderDetail.customer_name",
              name: "$orderDetail.product_name",
              image: "$orderDetail.product_image",
              qty: "$orderDetail.product_qty",
              total_price: "$orderDetail.total_price",
              grand_total: "$orderDetail.grand_total",
              transaction_date: "$created_at",
              delivery_status: "$orderDetail.delivery_status",
            },
          },
          {
            $sort: { created_at: -1 },
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
        reject(error);
        return;
      }
    }
    main();
  });
};

const dashboard = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const total_transaction = await query.countRecord(dbConstants.dbSchema.transactions, { dealer_id: requestParam.dealer_id });
        const requestCustomers = await query.selectWithAnd(dbConstants.dbSchema.requests, { dealer_id: requestParam.dealer_id }, { _id: 0, customer_id: 1 });
        const quationCustomers = await query.selectWithAnd(dbConstants.dbSchema.quotations, { dealer_id: requestParam.dealer_id }, { _id: 0, customer_id: 1 });
        let total_customer = requestCustomers.concat(quationCustomers);
        total_customer = total_customer.length;

        const joinArr = [
          { $match: { dealer_id: requestParam.dealer_id } },
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
        const total_sales = await query.joinWithAnd(dbConstants.dbSchema.orders, joinArr);
        console.log("total_sales", total_sales);
        const top_sales = await query.countRecord(dbConstants.dbSchema.transactions, { dealer_id: requestParam.dealer_id });
        resolve({ total_transaction, total_customer, total_sales: total_sales.length > 0 ? total_sales[0].total : 0, top_sales });
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
            $sort: { created_at: -1 },
          }, {
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

const sendInvoice = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const resData = await query.selectWithAndOne(dbConstants.dbSchema.invoices, { invoice_id: requestParam.invoice_id }, { _id: 0, customer_id: 1, dealer_id: 1 });
        if (!resData) {
          reject(errors(labels.LBL_INVALID_INVOICE_ID["EN"], responseCodes.Invalid));
          return;
        }
        const customerData = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: resData.customer_id }, { _id: 0, email: 1, phone_number: 1 });
        //send invoice from here via email or whatsup

        const notification_id = await idGeneratorHandler.generateId("COCN");
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: resData.dealer_id }, { _id: 0, name: 1 });
        // const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1 });
        let insertData = {
          notification_id,
          title: "Send Invoice",
          description: `${dealerName.name} send you invoice`,
          customer_id: resData.customer_id,
          dealer_id: resData.dealer_id,
          type: "customer"
        }
        await query.insertSingle(dbConstants.dbSchema.notifications, insertData);

        resolve({ message: "Invoice send successfully" });
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
  productAdd,
  productList,
  productDelete,
  customerList,
  requestList,
  quotationList,
  commonProductList,
  getProfile,
  getBusinessProfile,
  updateBusinessProfile,
  notificationList,
  invoiceList,
  updatedeliveryStatus,
  transactionList,
  dashboard,
  totalTopSalesProducts,
  sendInvoice
};