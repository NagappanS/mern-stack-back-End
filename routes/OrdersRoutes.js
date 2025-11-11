import express from "express";
import Order from "../models/Order.js";
import Food from "../models/Food.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/Users.js";
import DeliveryMan from "../models/DeliveryMan.js";
import { sendEmail } from "../utils/sendEmail.js"; 

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware: check login
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Get current logged-in user info
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password"); // exclude password
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Place new order
// Place new order with OTP & delivery man assignment
router.post("/orders", authMiddleware, async (req, res) => {
  try {
    const { items, deliveryInfo, paymentInfo, location } = req.body;
    if (!items?.length) return res.status(400).json({ error: "Items array is required" });

    let totalPrice = 0;
    for (const item of items) {
      const food = await Food.findById(item.food);
      if (!food) return res.status(400).json({ error: "Food not found" });
      totalPrice += food.price * item.quantity;
    }

    if (!paymentInfo || paymentInfo.status !== "succeeded") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // Assign a delivery man
    const deliveryMan = await DeliveryMan.findOne({ isAvailable: true });
    if (!deliveryMan) return res.status(400).json({ error: "No delivery man available" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newOrder = new Order({
      user: req.userId,
      items,
      totalPrice,
      deliveryInfo,
      paymentInfo,
      location,
      otp,
      deliveryMan: deliveryMan._id,
      status: "pending", // ensure initial status
    });

    await newOrder.save();

    // Mark delivery man as unavailable
    deliveryMan.isAvailable = false;
    await deliveryMan.save();

    const user = await User.findById(req.userId);
    console.log("User for email:", user.email);
    // Send email with OTP
    await sendEmail(
      user.email,
      "Your Food Orders OTP", // user email, make sure to populate req.user or fetch it
      otp
    );

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: err.message });
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


// Get logged-in user's orders
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("user", "name email") // show user info
      .populate({
        path: "items.food",
        model: "Food",
        select: "name price"
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create PaymentIntent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      payment_method_types: ["card"],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PaymentIntent creation failed" });
  }
});

// Test token
router.get("/test-token", authMiddleware, (req, res) => {
  res.json({ message: "Token is valid", userId: req.userId });
});

// Get all orders (Admin)
router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email") // show user info
      .populate({
        path: "items.food",
        model: "Food",
        select: "name price" // <-- include fields you need
      })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status (Admin)
router.put("/admin/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("user", "name email")
      .populate("items.food");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
