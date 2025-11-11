import mongoose from "mongoose";

const deliveryManSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: v => /^\d{10}$/.test(v), // exactly 10 digits
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  password : { type: String, required: true },
  isAvailable: { type: Boolean, default: true }, // mark if delivery man is free
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("DeliveryMan", deliveryManSchema);
