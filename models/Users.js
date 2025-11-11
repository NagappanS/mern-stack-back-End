import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  phone: {
    type: String,
    validate: {
      validator: v => !v || /^\d{10}$/.test(v), // allow empty, or exactly 10 digits
      message: props => `${props.value} is not a valid 10-digit phone number`
    },
    index: { unique: true, required: true } // sparse avoids errors for docs w/o phone
  },

  role: {
    type: String,
    enum: ["user", "restaurant", "admin", "delivery"],
    default: "user"
  },

  status: {
    type: String,
    enum: ["active", "blocked", "pending"],
    default: "active"
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
