const mongoose = require('mongoose');
const lessonSchema = require(__dirname + '/lessonSchema.js').lessonSchema;
const assignmentSchema = require(__dirname + '/assignmentSchema.js').assignmentSchema;
const fileSchema = require(__dirname + '/fileSchema.js').fileSchema;
const classSchema = new mongoose.Schema({
    title : String,
    isPaid : Boolean,
    price: Number,
    startDate : Date,
    endDate : Date,
    description: String,
    lesson : [lessonSchema],
    assignments: [assignmentSchema],
    files: [fileSchema]

});

exports.classSchema = classSchema;