"use strict";
const { Schema, model } = require("mongoose");
const notificationSchema = new Schema({
  notification_id: {
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
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "",
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

const Notification = model("Notification", notificationSchema);
module.exports = Notification;
