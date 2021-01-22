const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    studentId: String,
    classId: String,
    answer: String,
});


exports.answerSchema = answerSchema;
