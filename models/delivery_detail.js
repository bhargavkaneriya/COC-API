"use strict";
const { Schema, model } = require("mongoose");
const deliveryDetailSchema = new Schema({
  delivery_detail_id: {
    type: String,
    default: "",
  },
  customer_id: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: ""
  },
  state: {
    type: String,
    default: ""
  },
  city: {
    type: String,
    default: "",
  },
  pincode: {
    type: Number,
    default: 0,
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

const Delivery_Detail = model("Delivery_Detail", deliveryDetailSchema);
module.exports = Delivery_Detail;