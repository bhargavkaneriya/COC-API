"use strict";
const { Schema, model } = require("mongoose");
const cartSchema = new Schema({
  cart_id: {
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
  product_id: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    default: 0,
  },
  quotation_id:{
    type:String,
    default:""
  },
  dealer_product_id:{
    type:String,
    default:""
  },
  qty: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "inactive",
  },
  cart_type:{
    type:String,
    enum:["normal","quotation"],
    default:"normal"
  },
  offline_payment: {
    type: Boolean,
    default: false,
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

const Cart = model("Cart", cartSchema);
module.exports = Cart;