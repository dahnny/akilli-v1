const userSchema = require('../schemas/userSchema').userSchema;
const mongoose = require('mongoose');
const passport = require('passport');


const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

const userController = {
    postAdd: async function (req, res) {
        const classId = req.body.id;


        User.findOne({ "_id": req.user._id }, function (err, foundUser) {
            if (!err) {
                if (req.body.change == 'edit') {
                    const foundClass = foundUser.classes.id(classId);
                    req.session.class = foundClass;
                    res.render('create-class', { classes: foundClass });
                } else if (req.body.change == 'delete') {
                    const foundClass = foundUser.classes.id(classId).remove();
                    foundUser.save(function (err) {
                        if (!err) {
                            res.redirect('/dashboard');
                        } else {
                            console.log(err);
                        }
                    })
                }

            } else {
                console.error(err);
            }
        });

        // Class.findById(classId, function(err, foundClass){

        // });
    },
    editUser: async (req, res) => {
        const bio = req.body.bio;
        if (req.isAuthenticated()) {
            User.findById(req.user._id, function (err, user) {
                if (!err) {
                    if (req.fileValidationError) {
                        console.log(req.fileValidationError);
                        res.redirect('back')
                    }
                    else if (!req.file && !user.profileImage) {
                        req.flash('error', 'Please select an image to upload');
                        console.log('please select an image to upload');
                        res.redirect('back');
                    }
                    else {
                        if (req.file) {
                            var img = fs.readFileSync(req.file.path);
                            var encode_image = img.toString('base64');
                            user.profileImage = encode_image;
                        }
                        user.bio = bio;
                        user.save(function (err) {
                            req.flash('info', 'Your profile has been saved');
                            res.redirect('/dashboard');
                        });

                    }
                }
            });
        } else {
            res.redirect('/login');
        }
    }

}

module.exports = userController;