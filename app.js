require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport');   
const flash = require('express-flash');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const passportLocalMongoose = require('passport-local-mongoose');
var cloudinary = require('cloudinary').v2;

// Local lib
const upload = require('./helpers/storage').upload;

const app = express();

mongoose.connect('mongodb://localhost:27017/akilliDB', { useNewUrlParser: true, useUnifiedTopology: true });


app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use(session({
    secret: 'aklnodingaoinurjnanunva91n29',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

mongoose.set('useCreateIndex', true);

//schemas


const userSchema = require('./schemas/userSchema').userSchema;
const classSchema = require('./schemas/classSchema').classSchema;
const lessonSchema = require('./schemas/lessonSchema').lessonSchema;

userSchema.plugin(passportLocalMongoose);
// models
const User = new mongoose.model('User', userSchema);
const Class = new mongoose.model('Class', classSchema);
const Lesson = new mongoose.model('Lesson', lessonSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


cloudinary.config({
    cloud_name: 'dogbuti',
    api_key: '566727145985371',
    api_secret: process.env.CLOUDINARY_SECRET
});

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
    res.render('home')
});

app.get('/about', function (req, res) {
    res.render('about')
});

app.get('/contact', function (req, res) {
    res.render('contact');
});

app.get('/login', function (req, res) {
    // console.log(req.flash('error'));
    res.render('login')
});

app.get('/signup', function (req, res) {

    res.render('signup');
});


app.get('/curriculum', function(req, res){
    if(req.isAuthenticated()){
        res.render('create-lesson', {classes: req.session.class});
    }else{
        res.redirect('/login');
    }
});

app.get('/confirm/:token', function (req, res) {
    User.findOne({ emailConfirmationToken: req.params.token, emailConfirmationExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            req.flash('error', 'Email Confirmation token is invalid or has expired.');
            return res.redirect('/');
        }
        res.render('confirm', { user: user });
    });
})

app.get('/dashboard', function (req, res) {
    if (req.isAuthenticated()) {
        // console.log(req.user);
        res.render('dashboard', { user: req.user, isAuthenticated: req.isAuthenticated(), classes: req.user.classes });

    } else {

        res.redirect('/login');
    }

});

app.get('/user', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('edit-user', { user: req.user });
    } else {
        res.redirect('/login');
    }

});

app.get('/class-info', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('create-class', {classes : req.session.class});
    } else {
        res.redirect('/login');
    }
});

app.get('/view-curriculum', async function(req, res){
    if (req.isAuthenticated()) {
        let user;
        try {
            user = await User.findById(req.user._id);
            const foundClass = user.classes.id(req.session.class._id);
            req.session.class = foundClass;
            res.render('all-curriculum', {classes : foundClass});
        } catch (error) {
            console.error(error);
        }
        
    } else {
        res.redirect('/login');
    }
});

app.post('/signup', function (req, res) {
   var isActive = req.session.isActive = false;
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            req.flash('error', 'Error Occurred');
            res.redirect('/signup');
        } else {
            if (isActive) {
                passport.authenticate('local')(req, res, function () {
                    res.redirect('/');
                });
            } else {
                console.log(isActive);
                crypto.randomBytes(20, function (err, buf) {
                    var token = buf.toString('hex');
                    console.log(token);
                    User.findOne({ username: req.body.username }, function (err, user) {
                        if (!user) {
                            req.flash('error', 'No account with that email address exists.');
                            res.redirect('/signup');
                        }

                        user.email = req.body.email;
                        user.emailConfirmationToken = token;
                        user.emailConfirmationExpires = Date.now() + 86400000; // 1 hour


                        var options = {
                            host: 'smtp.gmail.com',
                            port: 465,
                            secure: true,
                            auth: {
                                user: process.env.SENDGRID_USERNAME,
                                pass: process.env.SENDGRID_PASSWORD
                            }
                        }

                        var client = nodemailer.createTransport(options);

                        var email = {
                            from: 'danielogbuti@gmail.com',
                            to: req.body.email,
                            subject: 'Confirm your email address',
                            text:
                                'Please click on the following link, or paste this into your browser to confirm your email address:\n\n' +
                                'http://' + req.headers.host + '/confirm/' + token + '\n\n' +
                                'If you did not request this, please ignore this email',

                        };

                        client.sendMail(email, function (err, info) {

                            if (err) {
                                console.log(err);
                                req.flash('error', 'Error Occured in sending email');
                                res.redirect('back');
                            }
                            else {
                                user.save(function () {
                                    req.flash('info', 'An e-mail has been sent to ' + req.body.email + ' with further instructions.');
                                    console.log('Message sent: ' + info.response);
                                    res.redirect('back');
                                });
                            }
                        });
                    });
                });
            }
        }
    });
});

app.post('/login', function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    if (req.isUnauthenticated()) {
        req.login(user, function (err) {
            if (err) {
                console.log(err);
                res.redirect('/login')
            } else {
                passport.authenticate('local')(req, res, function () {
                    User.findOne({username : user.username}, function(err, foundUser){
                        if(foundUser.active){
                            res.redirect('/dashboard');
                        }else{
                            req.flash('error', 'Please confirm your email address');
                            res.redirect('/login')
                        }
                    })
                    
                });
            }
        });
    }

})

app.post('/confirm/:token', function (req, res) {
    const token = req.params.token;

    User.findOne({ email: req.body.email, emailConfirmationToken: req.params.token, emailConfirmationExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            req.flash('error', 'Email or token is invalid or has expired.');
            return res.redirect('back');
        }
        user.active = req.session.isActive = true;
        user.emailConfirmationExpires = undefined;
        user.emailConfirmationToken = undefined;
        user.save(function (err) {

            req.flash('info', 'Your email has been confirmed');
            res.redirect('/login');
        });
    });

});

app.post('/user', upload.single('profile-image'), function (req, res) {
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


});


app.post('/edit-lesson', upload.single('edited-lesson-video'), async function (req, res) {
    const classId = req.body.id;
    const isEdit = req.body.isEdit;
    const lessonId = req.body.lessonId;

    // console.log(req.body);
    if (req.isAuthenticated()) {
        let user;
        let foundLesson;
        let foundClass;
        try {
            user = await User.findById(req.user._id);
            // console.log(req.body);
            foundClass = user.classes.id(classId);
            // console.log(foundClass);
            foundLesson = foundClass.lesson.id(lessonId);

        } catch (err) {
            console.log(err);
        }

        res.render('create-lesson', {lesson: foundLesson, classes: foundClass, isEdit: true})
    }

})

app.post('/upload-lesson', upload.single('lesson-video'), function (req, res) {
    const title = req.body.title;
    const content = req.body.content;
    const classId = req.body.id;
    const isEdit = req.body.isEdit;
    let videoId = crypto.randomBytes(10).toString('hex')

    if (req.isAuthenticated()) {
        User.findById(req.user._id, function (err, user) {

            if (!err) {
                if (req.fileValidationError) {
                    console.log(req.fileValidationError);
                }
                const foundClass = user.classes.id(classId);
                if (isEdit === 'true') {
                    lessonId = req.body.lessonId;
                    const foundLesson = foundClass.lesson.id(lessonId);
                    foundLesson.set({
                        title: title,
                        content: content
                    });
                    user.save();
                    if (req.file) {
                        cloudinary.uploader.upload(req.file.path, {
                            resource_type: 'video', overwrite: true,
                            public_id: "lesson-video" + "/" + foundLesson.videoId
                        },
                            function (error, result) {
                                if (!error) {
                                    foundLesson.set({
                                        video: result.secure_url
                                    });

                                    user.save(function (err) {
                                        if (!err) {
                                            req.flash('info', 'Class-info has been updated');
                                            res.redirect('/view-curriculum');
                                        }
                                    })
                                }
                            })
                    } else {
                        req.flash('info', 'Class-info has been updated');
                        res.redirect('/view-curriculum');
                    }

                } else {
                    if (!req.file) {
                        const newLesson = new Lesson({
                            videoId: videoId,
                            title: title,
                            content: content
                        });

                        foundClass.lesson.push(newLesson);
                        user.save(function (err) {
                            if (!err) {
                                res.redirect('/curriculum')
                            } else {
                                console.log(err);
                            }
                        });
                    } else {
                        cloudinary.uploader.upload(req.file.path, { resource_type: 'video', overwrite: true, public_id: "lesson-video" + "/" + videoId }, function (error, result) {
                            if (!error) {
                                const newLesson = new Lesson({
                                    videoId: videoId,
                                    title: title,
                                    video: result.secure_url,
                                    content: content
                                });

                                foundClass.lesson.push(newLesson);
                                user.save(function (err) {
                                    if (!err) {
                                        res.redirect('/dashboard')
                                    }
                                });

                            } else {
                                req.flash('error', error.message);
                                res.redirect('back')
                            }
                        });
                    }
                }
            }
        });
    }
});

app.post('/class-info', function (req, res) {
    const id = req.body.id;
    const title = req.body.title;
    const price = req.body.price
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const description = req.body.description;

    let isPaid;
    if (req.body.exampleRadio == 'option1') {
        isPaid = false;
    } else if (req.body.exampleRadio == 'option2') {
        isPaid = true;
    }

    const newClass = new Class({
        title: title,
        isPaid: isPaid,
        price: price,
        startDate: startDate,
        endDate: endDate,
        description: description
    });

    if (id) {
        User.findOne({ "_id": req.user._id }, function (err, foundUser) {
            if (!err) {

                const foundClass = foundUser.classes.id(id);
                foundClass.set({
                    title: title,
                    isPaid: isPaid,
                    price: price,
                    startDate: startDate,
                    endDate: endDate,
                    description: description
                });
                foundUser.save(function (err) {
                    if (!err) {
                        req.flash('info', 'Class-info has been updated');
                        res.redirect('/class');
                    } else {
                        console.error(err);
                        res.redirect
                    }
                })
            } else {
                console.error(err);
            }
        })
    } else {

        User.findById(req.user._id, function (err, foundUser) {
            if (!err) {
                foundUser.classes.push(newClass);
                foundUser.save(function () {
                    req.flash('info', 'Class-info has been saved');
                    res.redirect('/class');
                });
            } else {
                console.log(err);
                res.redirect('back');
            }
        });
    }
});

app.post('/class', function (req, res) {
    const classId = req.body.id;

    

    User.findOne({ "_id": req.user._id }, function (err, foundUser) {
        if (!err) {

            const foundClass = foundUser.classes.id(classId);
            req.session.class = foundClass;
            res.render('create-class', { classes: foundClass });
        } else {
            console.error(err);
        }
    })

    // Class.findById(classId, function(err, foundClass){

    // });
});


app.listen(3000, function () {
    console.log('Server started at port 3000');
});