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
  qty: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "inactive",
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