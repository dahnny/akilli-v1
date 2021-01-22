const mongoose = require('mongoose');

const enrolledSchema = new mongoose.Schema({
    data: {},
});

exports.enrolledSchema = enrolledSchema;