import express from "express";
import Deliveryman from "../models/DeliveryMan.js";
import Order from "../models/Order.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();


// Get all delivery men
router.get("/", async (req, res) => {
  const men = await Deliveryman.find();
  res.json(men);
});

// Get orders assigned to a delivery man
router.get("/orders/delivery/:id", async (req, res) => {
  try {
    const orders = await Order.find({ deliveryMan: req.params.id }).populate("user").populate("items.food");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Delete delivery man
router.delete("/delivery-men/:id", async (req, res) => {
  try {
    await Deliveryman.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// Verify OTP and mark order as delivered
router.post("/orders/:id/verify-otp", async (req, res) => {
  const { otp } = req.body;
  try {
    const order = await Order.findById(req.params.id).populate("deliveryMan");
    if (!order) return res.status(404).json({ msg: "Order not found" });

    if (order.otp === otp) {
      order.status = "delivered";
      await order.save();

      // Mark delivery man as available again
      if (order.deliveryMan) {
        order.deliveryMan.isAvailable = true;
        await order.deliveryMan.save();
      }

      return res.json({ msg: "OTP verified, order delivered", order });
    } else {
      return res.status(400).json({ msg: "Invalid OTP" });
    }
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

 export default router;