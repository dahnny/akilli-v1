

const mongoose = require('mongoose');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose')
const cloudinary = require('../helpers/cloudinaryConfig');
const User = require('../schemas/userSchema');


passport.use(User.createStrategy());

const resourcesController = {
    resources: async (req, res)=>{
        if (req.isAuthenticated()) {
            if (req.body.resourceId) {
                let result;
                let user;
                let foundClass;
                let file
                try {
                    
                    user = await User.findById(req.user._id);
                    const foundClassId = req.session.class._id;
                    foundClass = user.classes.id(foundClassId);
                    file = foundClass.files.id(req.body.resourceId);
                    console.log(file);
    
                } catch (error) {
                    console.log(error);
                }
                try {
                    result = await cloudinary.uploader.destroy(file.publicId);
                    file.remove();
                    user.save(function (err) {
                        if (!err) {
                            res.redirect('/resources');
                        }
                    })
                } catch (error) {
                    console.log(error);
                }
            }
            if (req.file) {
                const file = req.file;
                const filetypes = /jpeg|jpg|png|gif|mp4|3gp|webp|avi/;
                // Check ext
                const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
                // Check mime
                const mimetype = filetypes.test(file.mimetype);
    
                if (!mimetype && !extname) {
                    let result;
                    let user;
                    let foundClass;
                    try {
                        user = await User.findById(req.user._id);
                        const foundClassId = req.session.class._id;
                        foundClass = user.classes.id(foundClassId);
                        result = await cloudinary.uploader.upload(req.file.path, { public_id: file.filename, resource_type: 'raw', overwrite: true });
                    } catch (error) {
                        console.log(error);
                    }
                    const newFile = new File({
                        file: result.secure_url,
                        publicId: result.public_id
                    })
    
                    foundClass.files.push(newFile);
                    user.save(function (err) {
                        if (!err) {
                            res.redirect('/resources');
                        }
                    })
    
                } else {
                    req.flash('error', 'Unsupported Format');
                    res.redirect('/resources')
                }
    
            } else {
                console.log(req.file);
            }
        } else {
            res.redirect('/login')
        }
    }
}

module.exports = resourcesController;