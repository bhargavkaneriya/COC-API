"use strict";
const { Schema, model } = require("mongoose");
const invoiceSchema = new Schema({
  invoice_id: {
    type: String,
    default: "",
  },
  customer_id: {
    type: String,
    default: "",
  },
  dealer_id: {
    type: String,
    default: "",
  },
  order_id: {
    type: String,
    default: "",
  },
  invoice_document: {
    type: String,
    default: "",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const Invoice = model("Invoice", invoiceSchema);
module.exports = Invoice;
