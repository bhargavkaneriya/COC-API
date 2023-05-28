"use strict";
const { Schema, model } = require("mongoose");
const dealerSchema = new Schema({
  dealer_id: {
    type: String,
    default: "",
  },
  role_id: {
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
  phone_number: {
    type: String,
    default: "",
  },
  otp: {
    type: Number,
    default: 0,
  },
  password: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "inactive",
  },
  device_id: {
    type: String,
    default: "",
  },
  device_type: {
    type: String,
    enum: ["ios", "android", ""],
    default: "",
  },
  device_token: {
    type: String,
    default: "",
  },
  device_name: {
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
  products: {
    type: Array,
    default: [],
  },
});

const Dealer = model("Dealer", dealerSchema);
module.exports = Dealer;
