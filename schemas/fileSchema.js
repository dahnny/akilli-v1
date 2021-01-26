const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    file : String,
    publicId: String
});

const File = new mongoose.model('File', fileSchema);

module.exports = {File, fileSchema}