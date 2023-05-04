const mongoose =require('mongoose');

const courseSchema= new mongoose.Schema({
    name: String,
    price: String,
    category: String,
    field: String,
    teacherId: String,
    description: String,
    image: String,
});
module.exports=mongoose.model("Courses",courseSchema,"Courses");