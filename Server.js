import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import User from "./models/Users.js";
import Auth from "./routes/Auth.js";
import RestaurantRoutes from "./routes/RestaurantsRoutes.js";
import OrderRoutes from "./routes/OrdersRoutes.js";
import Admin from "./routes/Admin.js";
import Delivery from "./routes/DeliverymenRoutes.js";
import Stripe from "stripe";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// serve uploads folder so frontend can access images at /uploads/<filename>
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middlewares
// app.use(cors({
//   origin: "http://localhost:5173", // your Vite frontend
//   credentials: true,               // if using cookies/sessions
// }));
app.use(cors());
app.use(express.json());
app.use("/api/auth",Auth);
app.use("/api",RestaurantRoutes);
app.use("/api",OrderRoutes);
app.use("/api/admin",Admin);
app.use("/api",Delivery);

// Create user test route
app.post("/api/users", async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// Simple test route
app.get("/", (req, res) => {
    res.send("🍔 Food Delivery API Running 🚀");
});


app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// Create checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items, userId } = req.body;  // receive from frontend

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map(item => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook to confirm payment and save order
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Payment success event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Save to DB
    const newOrder = new Order({
      userId: session.client_reference_id,
      amount: session.amount_total / 100,
      paymentStatus: "paid",
      stripeSessionId: session.id,
    });

    newOrder.save()
      .then(() => console.log("✅ Order saved to DB"))
      .catch(err => console.error("❌ DB save failed:", err));
  }

  res.json({ received: true });
});
