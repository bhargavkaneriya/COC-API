"use strict";
const { Schema, model } = require("mongoose");
const transactionSchema = new Schema({
  transaction_id: {
    type: String,
    default: "",
  },
  dealer_id: {
    type: String,
    default: "",
  },
  customer_id: {
    type: String,
    default: "",
  },
  order_id: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    enum: ["online", "offline"],
    default: "offline",
  },
  status: {
    type: String,
    enum: ["success", "pending", "failed"],
    default: "pending",
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

const Transaction = model("Transaction", transactionSchema);
module.exports = Transaction;
