const mongoose = require('mongoose');
const answerSchema = require(__dirname + '/answerSchema.js').answerSchema;
const assignmentSchema = new mongoose.Schema({
    question : String,
    type: String,
    answer: [answerSchema]
});
const Assignment = new mongoose.model('Assignment', assignmentSchema);

module.exports = {Assignment, assignmentSchema};