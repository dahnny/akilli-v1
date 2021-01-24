var cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dogbuti',
    api_key: '566727145985371',
    api_secret: process.env.CLOUDINARY_SECRET
});

module.exports = cloudinary;