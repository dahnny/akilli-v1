const userSchema = require('../schemas/userSchema').userSchema;
const mongoose = require('mongoose');
const passport = require('passport')



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
    }
    
}

module.exports = userController;