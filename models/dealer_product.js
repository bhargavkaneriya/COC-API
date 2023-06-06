"use strict";
const { Schema, model } = require("mongoose");
const dealerProductSchema = new Schema({
  dealer_product_id: {
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
  name: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  code: {
    type: String,
    default: "",
  },
  discount_percentage: {
    type: Number,
    default: 0,
  },
  discount_amount: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
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

const Dealer_Product = model("Dealer_Product", dealerProductSchema);
module.exports = Dealer_Product;