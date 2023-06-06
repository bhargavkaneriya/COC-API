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
  is_verified:{
    type: Boolean,
    default: false
  },
  business_name: {
    type: String,
    default: "",
  },
  business_address: {
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
  business_profile_status:{
    type: String,
    default: "not_added",
  }
});

const Dealer = model("Dealer", dealerSchema);
module.exports = Dealer;
