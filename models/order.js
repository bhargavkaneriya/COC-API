"use strict";
const { Schema, model } = require("mongoose");
const orderSchema = new Schema({
  order_id: {
    type: String,
    default: "",
  },
  customer_id: {
    type: String,
    default: "",
  },
  delivery_detail_id: {
    type: String,
    default: "",
  },
  quotation_id: {
    type: String,
    default: "",
  },
  cart_id: {
    type: String,
    default: "",
  },
  product_id: {
    type: String,
    default: "",
  },
  dealer_id: {
    type: String,
    default: "",
  },
  customer_name: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  phone_number: {
    type: String,
    default: "",
  },
  shipping_address: {
    type: String,
    default: "",
  },
  state: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  pincode: {
    type: String,
    default: "",
  },
  product_name: {
    type: String,
    default: "",
  },
  product_qty: {
    type: Number,
    default: 0,
  },
  product_price: {
    type: String,
    default: "",
  },
  product_image: {
    type: String,
    default: "",
  },
  product_discount_percentage: {
    type: String,
    default: "",
  },
  product_discount_amount: {
    type: String,
    default: "",
  },
  qty: {
    type: Number,
    default: 0
  },
  total_price: {
    type: Number,
    default: 0
  },
  grand_total: {
    type: Number,
    default: 0
  },
  payment_method: {
    type: String,
    default: "",
  },
  offline_payment_doc: {
    type: String,
    default: "",
  },
  verify_document_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  order_status: {
    type: String,
    enum: ["pending", "delivered"],
    default: "pending"
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  }
});

const Order = model("Order", orderSchema);
module.exports = Order;