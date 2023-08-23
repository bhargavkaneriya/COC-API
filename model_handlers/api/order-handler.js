"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/order");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const errors = errorHandler;
const { sendSMS, sendPushNotification, sendEmail, sendInWhatsUp, uploadImage, uploadPDF } = require('../../utils/common');
const config = require('../../config');
const puppeteer = require('puppeteer');
const moment = require('moment');
const Razorpay = require("razorpay");
const shortid = require("shortid");
var razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const pdf = require('html-pdf');
const fs = require("fs");

const createOrder = (requestParam, req) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        console.log("requestParam 2626",requestParam);
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

        if (requestParam.quotation_id) {
          const quoId = await query.selectWithAndOne(dbConstants.dbSchema.quotations, { quotation_id: requestParam.quotation_id }, { _id: 0, quotation_id: 1 });
          if (!quoId) {
            reject(errors(labels.LBL_INVALID_QUOTATION_ID["EN"], responseCodes.ResourceNotFound));
            return;
          }
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
        if (req.files && req.files.offline_payment_doc) {
          const imageName = await new Promise((resolve, reject) => {
            uploadImage(req, (error, result) => {
              console.log("error", error);
              resolve(result.file);
            });
          });
          requestParam.offline_payment_doc = imageName
        }
          requestParam = { ...requestParam, quotation_id: cartDetail.quotation_id }
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
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: cartDetail.dealer_id }, { _id: 0, name: 1, device_token: 1, email: 1, phone_number: 1 });
        const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1, email: 1, phone_number: 1 });

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
        let message2 = `${customerName.name} has placed an online Order. Order id:${order_id}`;
        let emailMessage = `Dear Customer, Your order has been successfully placed. Your Order id: ${order_id}`;
        let wpMessage = `Dear Customer, Your order has been successfully placed. Your Order id: ${order_id}`;

        //
        if (requestParam.payment_method === "offline") {
          const notification_id = await idGeneratorHandler.generateId("COCN");
          const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1, device_token: 1 });
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
          message2 = `${customerName.name} has placed an offline Order. Order id:${order_id} and Quote id :${requestParam.quotation_id}`;
          await sendPushNotification({ tokens: [dealerName.device_token], title: "Offline Payment", description: `${customerName.name} requests for a offline/bank payment verification.` });
          emailMessage = `Dear Customer, Your order has been successfully placed. Your Order id: ${order_id} and Quote id : ${requestParam.quotation_id}`;
          wpMessage = `Dear Customer, Your order has been successfully placed. Your Order id: ${order_id} and Quote id : ${requestParam.quotation_id}`;
        }
        //

        await sendSMS(message, customer.phone_number);
        await sendPushNotification({ tokens: [customerName.device_token], title: "Order Placed", description: message });
        await sendPushNotification({ tokens: [dealerName.device_token], title: "Order Placed", description: message2 });

        await sendEmail({ toEmail: customerName.email, subject: "Order Placed", text: emailMessage });
        await sendInWhatsUp({ toNumber: customerName.phone_number, message: wpMessage });
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

        if (requestParam.payment_method === "online") {
          const randomStr = await idGeneratorHandler.generateMediumId(); // length, number, letters, special
          //start html-to-pdf
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
          <p style="position:absolute;top:348px;left:72px;white-space:nowrap" class="ft13">${deliveryDetail?.name}</p>
          <p style="position:absolute;top:389px;left:72px;white-space:nowrap" class="ft19">${deliveryDetail?.address}<br/>${deliveryDetail?.city} ${deliveryDetail?.state}<br/>${deliveryDetail?.pincode}<br/>${deliveryDetail?.email}<br/>+91&#160;${deliveryDetail?.phone_number}</p>
          <p style="position:absolute;top:314px;left:712px;white-space:nowrap" class="ft12">Invoice&#160;No.</p>
          <p style="position:absolute;top:340px;left:640px;white-space:nowrap" class="ft12">#${invoice_id}</p>
          <p style="position:absolute;top:365px;left:759px;white-space:nowrap" class="ft12">Date</p>
          <p style="position:absolute;top:391px;left:719px;white-space:nowrap" class="ft12">${moment().format('DD/MM/YYYY')}</p>
          
          <p style="position:absolute;top:590px;left:74px;white-space:nowrap" class="ft12">Description</p>
          <p style="position:absolute;top:590px;left:504px;white-space:nowrap" class="ft12">Unit&#160;Cost</p>
          <p style="position:absolute;top:590px;left:660px;white-space:nowrap" class="ft12">Qty</p>
          <p style="position:absolute;top:590px;left:740px;white-space:nowrap" class="ft12">Amount</p>
          
          <p style="position:absolute;top:631px;left:67px;white-space:nowrap" class="ft12">${dealerProduct.name}</p>
          <p style="position:absolute;top:662px;left:67px;white-space:nowrap" class="ft14">${dealerProduct.product_id}</p>
          <p style="position:absolute;top:632px;left:521px;white-space:nowrap" class="ft12">${dealerProduct.price}</p>
          <p style="position:absolute;top:632px;left:675px;white-space:nowrap" class="ft12">${cartDetail.qty}</p>
          <p style="position:absolute;top:632px;left:745px;white-space:nowrap" class="ft12">${requestParam?.total_price}</p>
          
          <p style="position:absolute;top:1110px;left:68px;white-space:nowrap" class="ft12">help@cementoncall.com</p>
          <p style="position:absolute;top:1110px;left:351px;white-space:nowrap" class="ft12">+91&#160;9898989898</p>
          <p style="position:absolute;top:1110px;left:606px;white-space:nowrap" class="ft12">www.cementoncall.com</p>
          <p style="position:absolute;top:710px;left:670px;white-space:nowrap" class="ft110">SubTotal&#160;₹${requestParam?.total_price}<br/>GST&#160;18%</p>
          <p style="position:absolute;top:747px;left:740px;white-space:nowrap" class="ft12">₹${Number((requestParam?.total_price * 18) / 100).toFixed(2)}</p>
          <p style="position:absolute;top:773px;left:662px;white-space:nowrap" class="ft12">Discount&#160;${dealerProduct.discount_percentage}</p>
          
          <p style="position:absolute;top:773px;left:764px;white-space:nowrap" class="ft12">₹${dealerProduct.discount_amount}</p>
          <p style="position:absolute;top:813px;left:658px;white-space:nowrap" class="ft15">Total&#160;₹${(requestParam.grand_total)}</p>
          <p style="position:absolute;top:108px;left:653px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>
          
          <p style="position:absolute;top:170px;left:611px;white-space:nowrap" class="ft12">25th&#160;main&#160;Rd,&#160;Marenahalli&#160;</p>
          <p style="position:absolute;top:196px;left:654px;white-space:nowrap" class="ft12">1st&#160;Phase,&#160;J.P&#160;Nagar</p>
          <p style="position:absolute;top:221px;left:656px;white-space:nowrap" class="ft12">Bangalore&#160;-&#160;525252</p>
          <p style="position:absolute;top:245px;left:673px;white-space:nowrap" class="ft12">Karnataka&#160;-&#160;India</p>
          <p style="position:absolute;top:140px;left:668px;white-space:nowrap" class="ft12">28COCAC5252Q</p>
          
          <p style="position:absolute;top:880px;left:75px;white-space:nowrap" class="ft111">Razorpay&#160;Payment&#160;reference&#160;Id&#160;:<br/>#${requestParam.razorpay_transaction_id}</p>
          <p style="position:absolute;top:950px;left:75px;white-space:nowrap" class="ft13">Dealer&#160;Info:</p>
          <p style="position:absolute;top:980px;left:75px;white-space:nowrap" class="ft112">${dealerName.name}<br/>${dealerName.email}<br/>+91&#160;${dealerName.phone_number}</p>
          </div>
          </body>
          </html>
          `;
          var phantomjs = require('phantomjs');
          const pdfOptions = {
            phantomPath: phantomjs.path,
            height: "50in",
            width: "12in",
            childProcessOptions: {
              env: {
                OPENSSL_CONF: '/dev/null',
              },
            },
            timeout: 50000

          };

          let pdfPath = `public/pdf/${randomStr}.pdf`
          try {
            pdf
              .create(htmlContent, pdfOptions)
              .toFile(pdfPath, async function (
                err,
                res
              ) {
                if (err) {
                  console.log("error", err);
                  reject(err);
                  return;
                }
                let AWS = require("aws-sdk");
                let s3 = new AWS.S3();

                const params = {
                  Bucket: config.aws.s3.cocBucket,
                  Key: `${randomStr}.pdf`,
                  Body: fs.readFileSync(pdfPath),
                  ContentType: "application/pdf",
                  ACL: "public-read",
                };

                fs.unlink(`./public/pdf/${randomStr}.pdf`, (err) => {
                  if (err) {
                    console.log("err", err);
                  };
                });

                let dataUpload = s3.upload(params, async (err, data) => {
                  if (err) {
                    console.log("error", err);
                    reject(err); // If you're using promises, you can reject here.
                    return;
                  }
                  resolve(data.Location);
                  return;
                });

              });

          } catch (error) {
            console.log("error", error);
          }
          await query.updateSingle(dbConstants.dbSchema.invoices, { invoice_document: `${randomStr}.pdf` }, { invoice_id });
        }
        //end html-to-pdf

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
              business_name:"$dealerDetail.business_name"
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
          element.image = config.aws.base_url + element.image
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


const razorpayMethod = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        const payment_capture = 1;
        const amount = parseInt(Number(Number(requestParam.amount)*100));
        const currency = "INR";

        const options = {
          amount,
          currency,
          receipt: shortid.generate(),
          payment_capture,
        };

        try {
          const response = await razorpay.orders.create(options);
          resolve({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
          });
          return;
        } catch (err) {
          console.log(err);
        }
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
  createOrder,
  orderList,
  razorpayMethod
};
