"use strict";
const { errorHandler } = require("xlcoreservice");
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
const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
});
const s3 = new AWS.S3();


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

async function sendAndroidPush(requestParam) {
  try {
    const message = {
      registration_ids: [requestParam.device_token],
      collapse_key: 'green',
      data: {
        data: {
          'messageFrom': 'COC',
          message: requestParam.title,
          body: requestParam.description,
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
      let notificationLog = {}
      resolve(notificationLog)
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

async function sendEmail(toEmail, subject, text, file) {
  try {
    const transporter = await nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.nodeMailer.toEmail,
        pass: config.nodeMailer.emailAppPassword
      }
    });
    const message = {
      from: config.nodeMailer.toEmail,
      to: toEmail,
      subject: subject,
      text: text,
      attachments: [
        {
          filename: 'sample.pdf',
          path: 'sample.pdf',
          contentType: 'application/pdf'
        }
      ]
    };
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

async function uploadImageToS3(bucketName, fileName, imagePath) {
  try {
    const fileContent = fs.readFileSync(imagePath);
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent
    };
    s3.upload(params, function (err, data) {
      if (err) {
        console.error('Error uploading image:', err);
      } else {
        console.log('Image uploaded successfully. Location:', data.Location);
      }
    });
  } catch (error) {
    console.log("error", error);
    reject(errors.internalServer(true))
    return
  }
}

async function getImageToS3(bucketName, fileName, imagePath) {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Expires: expiresInMinutes * 60 // URL expiration time in seconds
    };
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.log("error", error);
    reject(errors.internalServer(true))
    return
  }
}

async function sendInWhatsUp() {
  try {
    const pdfFile = 'sample.pdf';
    // const toPhoneNumber = 'RECIPIENT_PHONE_NUMBER'; // Replace with recipient's phone number
    // const client = twilio(accountSid, authToken);
    // const pdfData = fs.readFileSync(pdfFile, { encoding: 'base64' });
    // client.messages
    //   .create({
    //     from: `whatsapp:${fromPhoneNumber}`,
    //     body: 'PDF file',
    //     mediaUrl: `data:application/pdf;base64,${pdfData}`,
    //     to: `whatsapp:${toPhoneNumber}`
    //   })
    //   .then((message) => {
    //     console.log('PDF sent successfully! Message SID:', message.sid);
    //   })
    //   .catch((error) => {
    //     console.error('Error:', error.message);
    //   });
  } catch (error) {
    console.log("error", error);
    reject(errors.internalServer(true))
    return
  }
}

module.exports = {
  generateToken,
  verifyToken,
  sendSMS,
  sendAndroidPush,
  // sendIOSPush
  generatePDF,
  sendEmail,
  uploadImageToS3,
  getImageToS3,
  sendInWhatsUp
};