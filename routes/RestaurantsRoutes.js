// routes/restaurants.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Food from "../models/Food.js"; 
import Restaurant from "../models/Restaurant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

// ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

const router = express.Router();

/**
 * Upload an image (multipart/form-data, field name: image)
 * Returns: { filename, url }
*/
router.post("/restaurants/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    return res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// Create a new restaurant
router.post("/restaurants", async (req, res) => {
  try {
    const { name, location, image } = req.body;
    if (!name || !location) return res.status(400).json({ message: "Name and location required" });

    const newRestaurant = new Restaurant({ name, location, image }); // image: filename or URL
    const savedRestaurant = await newRestaurant.save();
    res.status(201).json(savedRestaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all restaurants
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update a restaurant
router.put("/restaurants/:id", async (req, res) => {
  try {
    const { name, location, image } = req.body;
    const updated = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { name, location, image },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Restaurant not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a restaurant and its uploaded image (if any)
router.delete("/restaurants/:id", async (req, res) => {
  try {
    const rest = await Restaurant.findByIdAndDelete(req.params.id);
    if (!rest) return res.status(404).json({ message: "Restaurant not found" });
    
    // If image is a filename stored in DB, remove file from uploads
    if (rest.image && !/^https?:\/\//i.test(rest.image)) {
      const filePath = path.join(uploadsDir, path.basename(rest.image));
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") console.error("Failed to delete image file:", err);
      });
    }
    
    res.json({ message: "Restaurant deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add food to a restaurant
// Create food with image upload
router.post("/foods", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, restaurant } = req.body;
    const image = req.file ? req.file.filename : null;

    const newFood = new Food({ name, price, description, restaurant, image });
    await newFood.save();
    res.status(201).json(newFood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get foods by restaurant
router.get("/foods/:restaurantId", async (req, res) => {
  try {
    const foods = await Food.find({ restaurant: req.params.restaurantId });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});    

// Get all foods
router.get("/foods", async (req, res) => {
  try {
    const foods = await Food.find().populate("restaurant", "name");
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update food
router.put("/foods/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, restaurant } = req.body;
    const updateData = { name, price, description, restaurant };

    if (req.file) {
      updateData.image = req.file.filename; // update image only if new image uploaded
    }

    const updatedFood = await Food.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedFood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete food
router.delete("/foods/:id", async (req, res) => {
  try {
    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: "Food deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
