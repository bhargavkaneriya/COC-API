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
const { sendSMS, sendPushNotification, sendEmail, uploadPDF } = require("../../utils/common");
const errors = errorHandler;
const puppeteer = require('puppeteer');
const moment = require('moment');

const verifyPaymentDocument = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const orderData = await query.selectWithAndOne(dbConstants.dbSchema.orders, { order_id: requestParam.order_id }, { _id: 0 });
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


          //start pdf
          const invoiceData = await query.selectWithAndOne(dbConstants.dbSchema.invoices, { order_id: requestParam.order_id }, { _id: 0, invoice_id: 1 });
          const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: orderData.dealer_id }, { _id: 0, dealer_id: 1, name: 1, device_token: 1, email: 1, phone_number: 1 });

          //start html-to-pdf
          async function convertHtmlToPdf(htmlContent, outputPath) {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            await page.pdf({ path: outputPath });

            await browser.close();
          }

          const htmlContent = `<!DOCTYPE html>
              <html xmlns="http://www.w3.org/1999/xhtml" lang="" xml:lang="">
              <head>
              <title></title>
              
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
              <br/>
              <style type="text/css">
              <!--
                p {margin: 0; padding: 0;}	.ft10{font-size:34px;font-family:Times;color:#000000;}
                .ft11{font-size:19px;font-family:Times;color:#000000;}
                .ft12{font-size:16px;font-family:Times;color:#000000;}
                .ft13{font-size:20px;font-family:Times;color:#000000;}
                .ft14{font-size:13px;font-family:Times;color:#000000;}
                .ft15{font-size:22px;font-family:Times;color:#000000;}
                .ft16{font-size:14px;font-family:Times;color:#000000;}
                .ft17{font-size:16px;line-height:27px;font-family:Times;color:#000000;}
                .ft18{font-size:16px;line-height:28px;font-family:Times;color:#000000;}
                .ft19{font-size:16px;line-height:25px;font-family:Times;color:#000000;}
                .ft110{font-size:16px;line-height:31px;font-family:Times;color:#000000;}
                .ft111{font-size:14px;line-height:28px;font-family:Times;color:#000000;}
                .ft112{font-size:13px;line-height:24px;font-family:Times;color:#000000;}
              -->
              </style>
              </head>
              <body vlink="blue" link="blue">
              <div id="page1-div" style="position:relative;width:892px;height:1263px;">
              <img width="165" height="125" src="https://cement-on-call.s3.amazonaws.com/FQDHjdnDfNBTNn.png" alt="background image" style="margin-top: 95px; margin-left: 60px;"/>
              <p style="position:absolute;top:32px;left:381px;white-space:nowrap" class="ft10">Invoice</p>
              <p style="position:absolute;top:228px;left:68px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>
              
              <p style="position:absolute;top:314px;left:72px;white-space:nowrap" class="ft12">Billed&#160;to</p>
              <p style="position:absolute;top:348px;left:72px;white-space:nowrap" class="ft13">${orderData?.customer_name}</p>
              <p style="position:absolute;top:389px;left:72px;white-space:nowrap" class="ft19">${orderData?.shipping_address}<br/>${orderData?.city} ${orderData?.state}<br/>${orderData?.pincode}<br/>${orderData?.email}<br/>+91&#160;${orderData?.phone_number}</p>
              <p style="position:absolute;top:314px;left:712px;white-space:nowrap" class="ft12">Invoice&#160;No.</p>
              <p style="position:absolute;top:340px;left:640px;white-space:nowrap" class="ft12">#${invoiceData?.invoice_id}</p>
              <p style="position:absolute;top:365px;left:759px;white-space:nowrap" class="ft12">Date</p>
              <p style="position:absolute;top:391px;left:719px;white-space:nowrap" class="ft12">${moment().format('DD/MM/YYYY')}</p>
              
              <p style="position:absolute;top:590px;left:74px;white-space:nowrap" class="ft12">Description</p>
              <p style="position:absolute;top:590px;left:504px;white-space:nowrap" class="ft12">Unit&#160;Cost</p>
              <p style="position:absolute;top:590px;left:660px;white-space:nowrap" class="ft12">Qty</p>
              <p style="position:absolute;top:590px;left:740px;white-space:nowrap" class="ft12">Amount</p>
              
              <p style="position:absolute;top:631px;left:67px;white-space:nowrap" class="ft12">${orderData.product_name}</p>
              <p style="position:absolute;top:662px;left:67px;white-space:nowrap" class="ft14">${orderData.product_id}</p>
              <p style="position:absolute;top:632px;left:521px;white-space:nowrap" class="ft12">${orderData.product_price}</p>
              <p style="position:absolute;top:632px;left:675px;white-space:nowrap" class="ft12">${orderData.product_qty}</p>
              <p style="position:absolute;top:632px;left:745px;white-space:nowrap" class="ft12">${orderData?.total_price}</p>
              
              <p style="position:absolute;top:1110px;left:68px;white-space:nowrap" class="ft12">help@cementoncall.com</p>
              <p style="position:absolute;top:1110px;left:351px;white-space:nowrap" class="ft12">+91&#160;9898989898</p>
              <p style="position:absolute;top:1110px;left:606px;white-space:nowrap" class="ft12">www.cementoncall.com</p>
              <p style="position:absolute;top:710px;left:670px;white-space:nowrap" class="ft110">SubTotal&#160;₹${orderData?.total_price}<br/>GST&#160;18%</p>
              <p style="position:absolute;top:747px;left:740px;white-space:nowrap" class="ft12">₹${Number((orderData?.total_price * 100) / 18).toFixed(2)}</p>
              <p style="position:absolute;top:773px;left:662px;white-space:nowrap" class="ft12">Discount&#160;${orderData.product_discount_percentage}</p>
              
              <p style="position:absolute;top:773px;left:764px;white-space:nowrap" class="ft12">₹${orderData.product_discount_amount}</p>
              <p style="position:absolute;top:813px;left:658px;white-space:nowrap" class="ft15">Total&#160;₹${(orderData.grand_total)}</p>
              <p style="position:absolute;top:108px;left:653px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>
              
              <p style="position:absolute;top:170px;left:611px;white-space:nowrap" class="ft12">25th&#160;main&#160;Rd,&#160;Marenahalli&#160;</p>
              <p style="position:absolute;top:196px;left:654px;white-space:nowrap" class="ft12">1st&#160;Phase,&#160;J.P&#160;Nagar</p>
              <p style="position:absolute;top:221px;left:656px;white-space:nowrap" class="ft12">Bangalore&#160;-&#160;525252</p>
              <p style="position:absolute;top:245px;left:673px;white-space:nowrap" class="ft12">Karnataka&#160;-&#160;India</p>
              <p style="position:absolute;top:140px;left:668px;white-space:nowrap" class="ft12">28COCAC5252Q</p>
              
              <p style="position:absolute;top:950px;left:75px;white-space:nowrap" class="ft13">Dealer&#160;Info:</p>
              <p style="position:absolute;top:980px;left:75px;white-space:nowrap" class="ft112">${dealerData.name}<br/>${dealerData.email}<br/>+91&#160;${dealerData.phone_number}</p>
              </div>
              </body>
              </html>
              `;
          const outputPath = './invoice.pdf';
          await convertHtmlToPdf(htmlContent, outputPath);
          const imageName = await new Promise((resolve, reject) => {
            uploadPDF(outputPath, (error, result) => {
              resolve(result.file);
            });
          });
          //end html-to-pdf
          await query.updateSingle(dbConstants.dbSchema.invoices, { invoice_document: imageName }, { invoice_id: invoiceData.invoice_id });

          //end pdf



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
            $lookup: {
              from: "quotations",
              localField: "quotation_id",
              foreignField: "quotation_id",
              as: "quotationsDetail",
            },
          },
          {
            $unwind: {
              path: "$quotationsDetail",
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
              quo_doc: "$quotationsDetail.quo_doc",
              offline_payment_doc: "$offline_payment_doc",
              verify_document_status: "$verify_document_status",
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
        response.map((element) => {
          element.quo_doc = config.aws.base_url + element.quo_doc
          element.offline_payment_doc = config.aws.base_url + element.offline_payment_doc
        })
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

        if (requestParam.status == "approved") {
          updatedata = { ...updatedata, is_verified: true }
        }

        if (requestParam.status == "rejected") {
          updatedata = { ...updatedata, rejected_reason: requestParam.rejected_reason }
          message = `Dear Dealer, Your request for listing your business on cement on call has been rejected.${requestParam.rejected_reason}`;
          emailMessage = `Dear Dealer, Your request for listing your business on cement on call has been rejected.${requestParam.rejected_reason}`;
        }
        await query.updateSingle(dbConstants.dbSchema.dealers, updatedata, { dealer_id: requestParam.dealer_id });

        await sendPushNotification({ tokens: [dealerData.device_token], title: "Verification", description: message });

        await sendEmail({ toEmail: dealerData.email, subject: "Verification", text: emailMessage });

        resolve({ message: "updated successfully" });
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

const notificationList = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {

        const sizePerPage = requestParam.sizePerPage ? parseInt(requestParam.sizePerPage) : 10;
        let page = requestParam.page ? parseInt(requestParam.page) : 0;
        if (page >= 1) {
          page = parseInt(page) - 1;
        }

        const comparisonColumnsAndValues = {};
        const totalRecords = await query.countRecord(dbConstants.dbSchema.notifications, comparisonColumnsAndValues);
        const total_page = totalRecords <= 10 ? 0 : Math.ceil(totalRecords / sizePerPage);

        if (requestParam.page && requestParam.page > total_page) {
          reject(errors(labels.LBL_RECORD_NOT_AVAILABLE["EN"], responseCodes.Invalid));
          return;
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
              notification_id: "$notification_id",
              title: "$title",
              description: "$description",
              notification_date: "$created_at",
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

module.exports = {
  verifyPaymentDocument,
  orderList,
  verificationRequestList,
  verificationRequestDetail,
  dealerDetail,
  verifyDealerDetail,
  abandonedCartList,
  quotationWaitingList,
  sendNotification,
  notificationList
};