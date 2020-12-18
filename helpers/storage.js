const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    // destination: function (req, file, cb) {
    //     cb(null, path.join(__dirname,'../', "/public"));
    // },

    // By default, multer removes file extensions so let's add them back
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '_' + Date.now() + file.originalname);
    }
});
let upload = multer({
    storage: storage, onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...')
    },
});

exports.upload = upload;