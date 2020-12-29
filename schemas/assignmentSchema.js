const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    question : String,
    type: String
});

exports.assignmentSchema = assignmentSchema;