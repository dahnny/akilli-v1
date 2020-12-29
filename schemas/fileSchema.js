const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    file : String,
    publicId: String
});

exports.fileSchema = fileSchema;