const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title : String,
    video : String,
    videoId : String,
    content : String
});

const Lesson = new mongoose.model('Lesson', lessonSchema);

module.exports = {Lesson, lessonSchema};