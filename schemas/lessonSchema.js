const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title : String,
    video : String,
    videoId : String,
    content : String
});

exports.lessonSchema = lessonSchema;