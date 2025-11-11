import mongoose from "mongoose";

const restaurantschema = new mongoose.Schema({
    name :{type : String , required :true},
    location: { type: String, required: true },
    image: { type: String }
},{ timestamps : true});

export default mongoose.model("Restaurant",restaurantschema);