const mongoose =require('mongoose');

const cartSchema= new mongoose.Schema({
    name: String,
    price: String,
    category: String,
    field: String,
    teacherId: String,
    description: String,
    image: String,
    studentId:String
});
module.exports=mongoose.model("Cart",cartSchema,"Cart");