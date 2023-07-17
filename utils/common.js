"use strict";
const { errorHandler, awsHandler, idGeneratorHandler } = require("xlcoreservice");
const jwt = require('jsonwebtoken');
const query = require("./../utils/query-creator");
const dbConstants = require("./../constants/db-constants");
const errors = errorHandler;
const labels = require("./../utils/labels.json");
const responseCodes = require("./../helpers/response-codes");
const config = require("../config");
const secretKey = config.jwt_secret_key;
const twilio = require("twilio");
const client = new twilio(config.twilio.accountSid, config.twilio.authToken);
const FCM = require('fcm-node');
const fcm = new FCM(config.fcm_push_server_key);
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const AWSHandler = new awsHandler();
AWSHandler.config({
  keyId: config.aws.accessKeyId,
  key: config.aws.secretAccessKey,
  region: config.aws.region,
});

// Function to generate a JWT token
function generateToken(payload) {
  return jwt.sign(payload, secretKey);
}

// Middleware to verify the JWT token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const tokenBearer = token.split(' ')[1];
  const decodedToken = jwt.decode(tokenBearer, secretKey);

  if (decodedToken.user_type === "customer") {
    const customerData = await query.selectWithAndOne(dbConstants.dbSchema.customers, { customer_id: decodedToken.id }, { _id: 0, access_token: 1 })
    if (customerData.access_token !== tokenBearer) {
      return (errors(labels.LBL_JWT_TOKEN_INVALID["EN"], responseCodes.Unauthorized));
    }
  } else if (decodedToken.user_type == "dealer") {
    const dealerData = await query.selectWithAndOne(dbConstants.dbSchema.dealers, { dealer_id: decodedToken.id }, { _id: 0, access_token: 1 })
    console.log("dealerData.access_token", dealerData.access_token);
    if (dealerData.access_token !== tokenBearer) {
      return (errors(labels.LBL_JWT_TOKEN_INVALID["EN"], responseCodes.Unauthorized));
    }
  }

  jwt.verify(tokenBearer, secretKey, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.user = decoded;
    next();
  });
}

async function generatePDF() {
  try {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream('sample.pdf'));
    doc.fontSize(18).text('Hello, this is a sample PDF!', 100, 100);
    doc.end();
  } catch (error) {
    console.log("error", error);
    reject(errors.internalServer(true))
    return
  }
}

const uploadImage = (req, done) => {
  async function main() {
    try {
      let fileNamediff;
      if (req.files.image) {
        fileNamediff = req.files.image
      } else if (req.files.gst_certificate) {
        fileNamediff = req.files.gst_certificate
      } else if (req.files.company_pan) {
        fileNamediff = req.files.company_pan
      } else if (req.files.company_registration) {
        fileNamediff = req.files.company_registration
      } else if (req.files.company_payment_details) {
        fileNamediff = req.files.company_payment_details
      } else if (req.files.dealer_agreement_with_COC) {
        fileNamediff = req.files.dealer_agreement_with_COC
      } else if (req.files.aadhar_card_of_director) {
        fileNamediff = req.files.aadhar_card_of_director
      } else if (req.files.offline_payment_doc) {
        fileNamediff = req.files.offline_payment_doc
      }
      let bucket = config.aws.s3.cocBucket;
      const randomStr = await idGeneratorHandler.generateMediumId(); // length, number, letters, special
      const file = fileNamediff;
      const fileType = file.name.split(".").pop();
      file.file_name = `${randomStr}.${fileType}`;
      file.bucket = bucket;
      file.contentType = fileType;
      const imgData = await AWSHandler.imageUpload(file);
      done(null, { url: imgData.Location, file: file.file_name });
      return;
    } catch (error) {
      console.log("error", error);
      done(
        errorHandler(labels.LBL_INTERNAL_SERVER['EN'], responseCodes.InternalServer)
      );
      return;
    }
  }
  main();
};

const deleteImage = (req, done) => {
  async function main() {
    try {
      const imgData = await AWSHandler.imageDelete(req);
      console.log("imgData", imgData);
      done(null, { message: "image deleted" });
      return;
    } catch (error) {
      console.log("error", error);
      done(
        errorHandler(labels.LBL_INTERNAL_SERVER['EN'], responseCodes.InternalServer)
      );
      return;
    }
  }
  main();
};

const getImage = (requestParam) => {
  // return new Promise((resolve, reject) => {
  async function main() {
    try {
      let bucket = config.aws.s3.userBucket;
      if (requestParam.bucket === "userService") {
        bucket = config.aws.s3.userServiceBucket;
      } else if (requestParam.bucket === "service") {
        bucket = config.aws.s3.serviceBucket;
      } else if (requestParam.bucket === "qrCode") {
        bucket = config.aws.s3.qrCodeBucket;
      }
      let folder = bucket.split("/");
      folder.shift();
      folder = folder.join("/")
      const image = await AWSHandler.imageGet({ bucket: config.aws.bucketName, key: `${folder}/gmdN3L7NgmHFTq.png` });
      // resolve(image.body);
      return;
    } catch (error) {
      console.log("error", error);
      return;
    }
  }
  // })
  main();
};



async function sendSMS(message, toNumber) {
  try {
    client.messages
      .create({
        body: message,
        to: `+91${toNumber}`,
        from: config.twilio.mobileNo
      })
      .then(message => console.log(message.sid))
      .catch(error => {
        console.log(error);
      });
  } catch (error) {
    console.log("error", error)
    return
  }
}

async function sendInWhatsUp(requestParam) {
  try {
    let sendParams = {
      body: requestParam?.message,
      from: `whatsapp:${config.twilio.mobileNo}`,
      to: `whatsapp:${requestParam?.toNumber}`
    };

    if (requestParam.filePath) {
      sendParams = {
        body: requestParam?.message,
        from: `whatsapp:${config.twilio.mobileNo}`,
        // mediaUrl: ['https://images.unsplash.com/photo-1545093149-618ce3bcf49d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=668&q=80'],
        mediaUrl: requestParam?.filePath,
        to: `whatsapp:${requestParam?.toNumber}`
      }
    }
    client.messages
      .create(sendParams)
      .then(message => console.log(`Message SID: ${message.sid}`))
      .catch(error => console.error(error));
  } catch (error) {
    console.log("error", error);
    reject(errors.internalServer(true))
    return
  }
}

async function sendPushNotification(requestParam) {
  try {
    const message = {
      registration_ids: requestParam?.tokens,
      collapse_key: 'green',
      data: {
        data: {
          'messageFrom': 'COC',
          message: requestParam?.title,
          body: requestParam?.description,
          push_type: 'normal'
        },
      },
    };

    fcm.send(message, function (error, result) {
      let pushResult
      if (error) {
        pushResult = 'failed'
        console.error("error=>", error)
        // reject(errors.internalServer(true))
        // return
      } else {
        result = JSON.parse(result)
        if (result.success == 1) {
          pushResult = 'success'
        } else {
          pushResult = 'failed'
        }
      }
      return;
    });
  } catch (error) {
    console.log(error)
    reject(errors.internalServer(true))
    return
  }
}

// const sendIOSPush = async (requestParam) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       let note = new apn.Notification();
//       note.expiry = Math.floor(Date.now() / 1000) + 3600;
//       note.badge = 1;
//       note.sound = "ping.aiff";
//       note.alert = requestParam.description;
//       note.payload.body = {
//         'messageFrom': 'Chapchap',
//         'title': requestParam.title,
//         'message': requestParam.description,
//         'push_type': 'normal',
//       };
//       if (requestParam.user_type == 'consumer') {
//         note.topic = config.push_notification.bundle_id_consumer;
//       } else if (requestParam.user_type == 'restaurant') {
//         note.topic = config.push_notification.bundle_id_restaturant;
//       } else {
//         note.topic = config.push_notification.bundle_id_delivery_boy;
//       }
//       apnProvider.send(note, requestParam.device_token).then((result) => {
//         console.log("======>" + JSON.stringify(result));
//         let pushResult
//         if (result.failed.length == 0) {
//           pushResult = 'success'
//         } else {
//           pushResult = 'failed'
//         }
//         let notificationLog = {}
//         resolve(notificationLog)
//         return;
//       }).catch((error) => {
//         console.log("error------------------------------------=>" + error)
//         reject(errors.internalServer(true))
//         return
//       });
//     } catch (error) {
//       console.log(error)
//       reject(errors.internalServer(true))
//       return
//     }
//   })
// }

async function sendEmail(requestParam) {
  try {
    const transporter = await nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.nodeMailer.fromEmail,
        pass: config.nodeMailer.emailAppPassword
      }
    });
    let message = {
      from: config.nodeMailer.fromEmail,
      to: requestParam?.toEmail,
      subject: requestParam?.subject,
      text: requestParam?.text
    };
    if (requestParam.filePath) {
      message = {
        from: config.nodeMailer.fromEmail,
        to: requestParam?.toEmail,
        subject: requestParam?.subject,
        text: requestParam?.text,
        attachments: [
          {
            filename: 'sample.pdf',
            path: requestParam?.filePath,
            contentType: 'application/pdf'
          }
        ]
      };
    }
    transporter.sendMail(message, (error, info) => {
      if (error) {
        console.log('Error occurred while sending email:', error.message);
      } else {
        console.log('Email sent successfully!', info.response);
      }
    });
  } catch (error) {
    console.log("error", error);
    reject(errors.internalServer(true))
    return
  }
}


module.exports = {
  generateToken,
  verifyToken,
  generatePDF,
  uploadImage,
  getImage,
  deleteImage,
  sendSMS,
  sendInWhatsUp,
  sendPushNotification,
  sendEmail
};