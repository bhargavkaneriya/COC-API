"use strict";
const dbConstants = require("./../../constants/db-constants");
const responseCodes = require("./../../helpers/response-codes");
const query = require("./../../utils/query-creator");
const labels = require("./../../utils/labels.json");
require("./../../models/quotation");
const _ = require("underscore");
const { errorHandler, idGeneratorHandler } = require("xlcoreservice");
const { sendSMS, sendPushNotification, sendEmail, sendInWhatsUp, uploadImage, uploadPDF } = require("../../utils/common");
const errors = errorHandler;
const config = require('../../config');
const pdf = require('html-pdf');
const moment = require('moment');
const fs = require("fs");

const createQuotation = (requestParam) => {
  return new Promise((resolve, reject) => {
    async function main() {
      try {
        let quotation_id = await idGeneratorHandler.generateId("COCQ");
        const randomStr = await idGeneratorHandler.generateMediumId(); // length, number, letters, special
        requestParam = { ...requestParam, quotation_id };
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: requestParam.dealer_id, product_id: requestParam.product_id }, { _id: 0, dealer_product_id: 1, name: 1 });
        requestParam = { ...requestParam, dealer_product_id: dealerProduct.dealer_product_id };
        await query.insertSingle(dbConstants.dbSchema.quotations, requestParam);
        await query.updateSingle(dbConstants.dbSchema.requests, { is_quotation_created: true }, { request_id: requestParam.request_id });
        //notification add
        const notification_id = await idGeneratorHandler.generateId("COCN");
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: requestParam.dealer_id }, { _id: 0, name: 1, email: 1, phone_number: 1, business_name:1 });
        const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: requestParam.customer_id }, { _id: 0, name: 1, phone_number: 1, device_token: 1, email: 1 });
        let insertData = {
          notification_id,
          title: "Quotation send to customer",
          description: `${dealerName.business_name} send quotation to ${customerName.name}`,
          customer_id: requestParam.customer_id,
          dealer_id: requestParam.dealer_id,
          type: "customer"
        }
        await query.insertSingle(dbConstants.dbSchema.notifications, insertData);
        //

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
          <p style="position:absolute;top:32px;left:381px;white-space:nowrap" class="ft10">Quotation</p>
          <p style="position:absolute;top:228px;left:68px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>
          
          <p style="position:absolute;top:314px;left:72px;white-space:nowrap" class="ft12">To,</p>
          <p style="position:absolute;top:348px;left:72px;white-space:nowrap" class="ft13">${customerName?.name}</p>
          <p style="position:absolute;top:354px;left:72px;white-space:nowrap" class="ft19"><br/>${customerName?.email}<br/>+91&#160;${customerName?.phone_number}</p>
          <p style="position:absolute;top:314px;left:695px;white-space:nowrap" class="ft12">Quotation&#160;No.</p>
          <p style="position:absolute;top:340px;left:640px;white-space:nowrap" class="ft12">#${quotation_id}</p>
          <p style="position:absolute;top:365px;left:759px;white-space:nowrap" class="ft12">Date</p>
          <p style="position:absolute;top:391px;left:719px;white-space:nowrap" class="ft12">${moment().format('DD/MM/YYYY')}</p>
          
          <p style="position:absolute;top:590px;left:74px;white-space:nowrap" class="ft12">Description</p>
          <p style="position:absolute;top:590px;left:504px;white-space:nowrap" class="ft12">Unit&#160;Cost</p>
          <p style="position:absolute;top:590px;left:660px;white-space:nowrap" class="ft12">Qty</p>
          <p style="position:absolute;top:590px;left:740px;white-space:nowrap" class="ft12">Amount</p>
          
          <p style="position:absolute;top:631px;left:67px;white-space:nowrap" class="ft12">${dealerProduct?.name} (50 KG)</p>
          <p style="position:absolute;top:662px;left:67px;white-space:nowrap" class="ft14">#${requestParam.product_id}</p>
          <p style="position:absolute;top:632px;left:521px;white-space:nowrap" class="ft12">₹${requestParam?.product_price}</p>
          <p style="position:absolute;top:632px;left:675px;white-space:nowrap" class="ft12">${requestParam?.qty} Bag</p>
          <p style="position:absolute;top:632px;left:745px;white-space:nowrap" class="ft12">₹${requestParam?.total_price}</p>
          
          <p style="position:absolute;top:1100px;left:68px;white-space:nowrap" class="ft12">help@cementoncall.com</p>
          <p style="position:absolute;top:1100px;left:351px;white-space:nowrap" class="ft12">+91&#160;9898989898</p>
          <p style="position:absolute;top:1100px;left:606px;white-space:nowrap" class="ft12">www.cementoncall.com</p>
          <p style="position:absolute;top:710px;left:670px;white-space:nowrap" class="ft110">SubTotal&#160;₹${requestParam?.total_price}<br/>GST&#160;18%</p>
          <p style="position:absolute;top:747px;left:740px;white-space:nowrap" class="ft12">${Number((requestParam?.total_price * 18) / 100).toFixed(2)}</p>
          
          <p style="position:absolute;top:813px;left:658px;white-space:nowrap" class="ft15">Total&#160;₹${requestParam?.grand_total}</p>
          <p style="position:absolute;top:108px;left:653px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>
          
          <p style="position:absolute;top:170px;left:611px;white-space:nowrap" class="ft12">25th&#160;main&#160;Rd,&#160;Marenahalli&#160;</p>
          <p style="position:absolute;top:196px;left:654px;white-space:nowrap" class="ft12">1st&#160;Phase,&#160;J.P&#160;Nagar</p>
          <p style="position:absolute;top:221px;left:656px;white-space:nowrap" class="ft12">Bangalore&#160;-&#160;525252</p>
          <p style="position:absolute;top:245px;left:673px;white-space:nowrap" class="ft12">Karnataka - India</p>
          <p style="position:absolute;top:140px;left:745px;white-space:nowrap" class="ft12">From</p>
          
          <p style="position:absolute;top:950px;left:75px;white-space:nowrap" class="ft13">Dealer&#160;Info:</p>
          <p style="position:absolute;top:980px;left:75px;white-space:nowrap" class="ft112">${dealerName?.business_name}<br/>${dealerName?.email}<br/>+91&#160;${dealerName?.phone_number}</p>
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
        await query.updateSingle(dbConstants.dbSchema.quotations, { quo_doc: `${randomStr}.pdf` }, { quotation_id: quotation_id })
        //end html-to-pdf

        await sendSMS(`Dear customer, ${dealerName.business_name} sent a quotation`, customerName.phone_number);
        await sendPushNotification({ tokens: [customerName.device_token], title: "Quotation Created", description: `${dealerName.business_name} sent a quotation.` });
        // await sendEmail({ toEmail: customerName.email, subject: "Quotation Created", text: `Dear Customer, ${dealerName.business_name} sent a quotation. Note : file is attached here.`, filePath: imageName });
        await sendInWhatsUp({ toNumber: customerName.phone_number, message: `Dear Customer, ${dealerName.business_name} sent a quotation. Note : file is attached here.`, filePath: "https://images.unsplash.com/photo-1545093149-618ce3bcf49d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=668&q=80" });
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
        const quaData = await query.selectWithAndOne(dbConstants.dbSchema.quotations, { quotation_id: requestParam.quotation_id }, { _id: 0, quotation_id: 1, dealer_id: 1, product_id: 1, customer_id: 1, qty:1 });
        if (!quaData) {
          reject(errors(labels.LBL_INVALID_QUOTATION_ID["EN"], responseCodes.ResourceNotFound));
          return;
        }
        const existQID = await query.selectWithAndOne(dbConstants.dbSchema.orders, { quotation_id: requestParam.quotation_id }, { _id: 0, order_id: 1, quotation_id: 1 });
        if (existQID) {
          reject(errors(labels.LBL_EXIST_QUOTATION_ID["EN"], responseCodes.Invalid));
          return;
        }
        const dealerProduct = await query.selectWithAndOne(dbConstants.dbSchema.dealer_product, { dealer_id: quaData.dealer_id, product_id: quaData.product_id }, { _id: 0, dealer_product_id: 1, name: 1 });
        const customerName = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: quaData.customer_id }, { _id: 0, name: 1, phone_number: 1, device_token: 1, email: 1 });
        const dealerName = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: quaData.dealer_id }, { _id: 0, name: 1, email: 1, phone_number: 1, business_name:1 });

        //start html-to-pdf
        const randomStr = await idGeneratorHandler.generateMediumId(); // length, number, letters, special
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
                            <p style="position:absolute;top:32px;left:381px;white-space:nowrap" class="ft10">Quotation</p>
                            <p style="position:absolute;top:228px;left:68px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>

                            <p style="position:absolute;top:314px;left:72px;white-space:nowrap" class="ft12">To,</p>
                            <p style="position:absolute;top:348px;left:72px;white-space:nowrap" class="ft13">${customerName?.name}</p>
                            <p style="position:absolute;top:354px;left:72px;white-space:nowrap" class="ft19"><br/>${customerName?.email}<br/>+91&#160;${customerName?.phone_number}</p>
                            <p style="position:absolute;top:314px;left:695px;white-space:nowrap" class="ft12">Quotation&#160;No.</p>
                            <p style="position:absolute;top:340px;left:640px;white-space:nowrap" class="ft12">#${requestParam.quotation_id}</p>
                            <p style="position:absolute;top:365px;left:759px;white-space:nowrap" class="ft12">Date</p>
                            <p style="position:absolute;top:391px;left:719px;white-space:nowrap" class="ft12">${moment().format('DD/MM/YYYY')}</p>

                            <p style="position:absolute;top:590px;left:74px;white-space:nowrap" class="ft12">Description</p>
                            <p style="position:absolute;top:590px;left:504px;white-space:nowrap" class="ft12">Unit&#160;Cost</p>
                            <p style="position:absolute;top:590px;left:660px;white-space:nowrap" class="ft12">Qty</p>
                            <p style="position:absolute;top:590px;left:740px;white-space:nowrap" class="ft12">Amount</p>

                            <p style="position:absolute;top:631px;left:67px;white-space:nowrap" class="ft12">${dealerProduct?.name} (50 KG)</p>
                            <p style="position:absolute;top:662px;left:67px;white-space:nowrap" class="ft14">#${quaData.product_id}</p>
                            <p style="position:absolute;top:632px;left:521px;white-space:nowrap" class="ft12">₹${requestParam?.product_price}</p>
                            <p style="position:absolute;top:632px;left:675px;white-space:nowrap" class="ft12">${quaData?.qty} Bag</p>
                            <p style="position:absolute;top:632px;left:745px;white-space:nowrap" class="ft12">₹${requestParam?.total_price}</p>

                            <p style="position:absolute;top:1100px;left:68px;white-space:nowrap" class="ft12">help@cementoncall.com</p>
                            <p style="position:absolute;top:1100px;left:351px;white-space:nowrap" class="ft12">+91&#160;9898989898</p>
                            <p style="position:absolute;top:1100px;left:606px;white-space:nowrap" class="ft12">www.cementoncall.com</p>
                            <p style="position:absolute;top:710px;left:670px;white-space:nowrap" class="ft110">SubTotal&#160;₹${requestParam?.total_price}<br/>GST&#160;18%</p>
                            <p style="position:absolute;top:747px;left:740px;white-space:nowrap" class="ft12">${Number((requestParam?.total_price * 18) / 100).toFixed(2)}</p>

                            <p style="position:absolute;top:813px;left:658px;white-space:nowrap" class="ft15">Total&#160;₹${requestParam?.grand_total}</p>
                            <p style="position:absolute;top:108px;left:653px;white-space:nowrap" class="ft11">Cement&#160;On&#160;Call</p>

                            <p style="position:absolute;top:170px;left:611px;white-space:nowrap" class="ft12">25th&#160;main&#160;Rd,&#160;Marenahalli&#160;</p>
                            <p style="position:absolute;top:196px;left:654px;white-space:nowrap" class="ft12">1st&#160;Phase,&#160;J.P&#160;Nagar</p>
                            <p style="position:absolute;top:221px;left:656px;white-space:nowrap" class="ft12">Bangalore&#160;-&#160;525252</p>
                            <p style="position:absolute;top:245px;left:673px;white-space:nowrap" class="ft12">Karnataka - India</p>
                            <p style="position:absolute;top:140px;left:745px;white-space:nowrap" class="ft12">From</p>

                            <p style="position:absolute;top:950px;left:75px;white-space:nowrap" class="ft13">Dealer&#160;Info:</p>
                            <p style="position:absolute;top:980px;left:75px;white-space:nowrap" class="ft112">${dealerName?.business_name}<br/>${dealerName?.email}<br/>+91&#160;${dealerName?.phone_number}</p>
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
        //end html-to-pdf
        await query.updateSingle(dbConstants.dbSchema.quotations, { total_price: Number(requestParam.total_price), grand_total: Number(requestParam.grand_total), product_price: Number(requestParam.product_price), quo_doc: `${randomStr}.pdf` }, { quotation_id: requestParam.quotation_id });
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
        quotationDetails.product_image = config.aws.base_url + productDetails.image;
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
