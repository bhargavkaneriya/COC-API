"use strict";
const { errorHandler } = require("xlcoreservice");
const jwt = require('jsonwebtoken');
const query = require("./../utils/query-creator");
const secretKey = process.env.JWT_SECRET_KEY;
const dbConstants = require("./../constants/db-constants");
const errors = errorHandler;
const labels = require("./../utils/labels.json");
const responseCodes = require("./../helpers/response-codes");

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

module.exports = {
  generateToken,
  verifyToken
};