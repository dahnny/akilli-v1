const mongoose = require('mongoose');
const lessonSchema = require(__dirname + '/lessonSchema.js').lessonSchema;
const classSchema = new mongoose.Schema({
    title : String,
    isPaid : Boolean,
    price: Number,
    startDate : Date,
    endDate : Date,
    description: String,
    lesson : [lessonSchema]

});

exports.classSchema = classSchema;