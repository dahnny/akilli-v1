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
const path = require('path');
const https = require('https');
const request = require('request');
const mg = require('nodemailer-mailgun-transport');

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
const assignmentSchema = require('./schemas/assignmentSchema').assignmentSchema;
const fileSchema = require('./schemas/fileSchema').fileSchema;
const enrolledSchema = require('./schemas/enrolledSchema').enrolledSchema;
const answerSchema = require('./schemas/answerSchema').answerSchema;


userSchema.plugin(passportLocalMongoose);
// models
const User = new mongoose.model('User', userSchema);
const Class = new mongoose.model('Class', classSchema);
const Lesson = new mongoose.model('Lesson', lessonSchema);
const Assignment = new mongoose.model("Assignment", assignmentSchema);
const File = new mongoose.model('File', fileSchema);
const EnrolledClass = new mongoose.model('EnrolledClass', enrolledSchema);
const Answer = new mongoose.model('Answer', answerSchema);

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
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.render('home')
    }

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


app.get('/curriculum', function (req, res) {
    if (req.isAuthenticated()) {
        if (req.session.class) {
            res.render('create-lesson', { classes: req.session.class });
        } else {
            req.flash('error', 'Please complete class-info before proceeding');
            res.redirect('back');
        }
    } else {
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

app.get('/dashboard', async function (req, res) {
    if (req.isAuthenticated()) {
        if (req.session.paymentDetails != null && req.session.paymentDetails != {}) {
            try {
                user = await User.findById(req.user._id);
                user.enrolledClasses.forEach(async enrolledUser => {
                    if (enrolledUser.data.classId == req.session.paymentDetails.classId) {
                        req.session.paymentDetails = undefined;
                        let tutor = await User.findById(enrolledUser.data.userId);
                        let foundClass = tutor.classes.id(enrolledUser.data.classId);
                        if (foundClass == undefined) {
                            user.enrolledClasses.splice(index, 1);
                            await user.save();
                            res.redirect('/dashboard')
                        } else {
                            res.redirect('/dashboard');
                        }

                    }
                });
                const enrolled = new EnrolledClass({
                    data: req.session.paymentDetails
                });
                user.enrolledClasses.push(enrolled);
                user.save(function (err) {
                    if (!err) {
                        req.session.paymentDetails = undefined;
                        res.render('dashboard', { user: req.user, isAuthenticated: req.isAuthenticated(), classes: req.user.classes });

                    }
                });
            } catch (error) {
                console.log(error);
            }
        } else {
            user = await User.findById(req.user._id);
            user.enrolledClasses.forEach(async (enrolledUser, index) => {
                let tutor = await User.findById(enrolledUser.data.userId);
                let foundClass = tutor.classes.id(enrolledUser.data.classId);
                console.log(foundClass);
                if (foundClass == undefined) {
                    user.enrolledClasses.splice(index, 1);
                    user.save(function () {
                        res.render('dashboard', { user: req.user, isAuthenticated: req.isAuthenticated(), classes: req.user.classes });

                    });
                }
            });
            res.render('dashboard', { user: req.user, isAuthenticated: req.isAuthenticated(), classes: req.user.classes });
        }


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

app.get('/class', function (req, res) {
    req.session.class = undefined;
    res.redirect('/class-info');
})

app.get('/class-info', function (req, res) {
    if (req.isAuthenticated()) {
        console.log(req.session.class);
        if (req.session.class) {
            res.render('create-class', { classes: req.session.class });
        } else {
            res.render('create-class')
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/view-curriculum', async function (req, res) {
    if (req.isAuthenticated()) {
        let user;
        try {
            user = await User.findById(req.user._id);
            const foundClass = user.classes.id(req.session.class._id);
            req.session.class = foundClass;
            res.render('all-curriculum', { classes: foundClass });

        } catch (error) {
            console.error(error);
        }

    } else {
        res.redirect('/login');
    }
});

app.get('/assignment', async function (req, res) {
    if (req.isAuthenticated()) {
        let user;
        try {
            user = await User.findById(req.user._id);
            const foundClass = user.classes.id(req.session.class._id);
            req.session.class = foundClass;
            res.render('assignment', { classes: foundClass });

        } catch (error) {
            console.error(error);
            req.flash('error', 'Please complete class-info before proceeding');
            res.redirect('back')
        }

    } else {
        res.redirect('/login');
    }
});


app.get('/resources', async function (req, res) {
    if (req.isAuthenticated()) {
        let user;
        try {
            user = await User.findById(req.user._id);
            const foundClass = user.classes.id(req.session.class._id);
            req.session.class = foundClass;
            res.render('resources', { classes: foundClass });

        } catch (error) {
            console.error(error);
            req.flash('error', 'please complete class-info before proceeding');
            res.redirect('back');
        }

    } else {
        res.redirect('/login');
    }

});

app.get('/tutor/:classId', async function (req, res) {
    const classId = req.params.classId;

    if (req.isAuthenticated()) {
        let user;
        let foundClass;
        try {
            user = await User.findById(req.user._id);
            foundClass = user.classes.id(classId);
            res.render('tutor-dashboard', { isTutor: true, classes: foundClass, user: user });
        } catch (error) {
            console.log(error);
        }
    } else {
        res.redirect('/login');
    }

});

app.get('/tutor/:classId/curriculum/:lessonNumber', async function (req, res) {
    const classId = req.params.classId;
    const number = req.params.lessonNumber;
    if (req.isAuthenticated()) {
        let user;
        let foundClass;
        try {
            user = await User.findById(req.user._id);
            foundClass = user.classes.id(classId);
        } catch (error) {
            console.log(error);
        }
        if (number > foundClass.lesson.length || number == 0 || typeof foundClass.lesson == undefined || foundClass.lesson == null) {
            console.log('here');
            res.redirect('back')
        } else {
            const lesson = foundClass.lesson[number - 1];
            console.log(lesson);
            res.render('tutor-assignments', {
                isTutor: true,
                classes: foundClass,
                lesson: lesson,
                currentNumber: number,
                tutor: null,
                user: user,
                numberOflessons: foundClass.lesson.length
            });
        }

    } else {
        res.redirect('/login');
    }
});

app.get('/free', async function (req, res) {
    const id = req.query.class_select;
    const username = req.query.user;


    let user;

    try {
        user = await User.findOne({ username: username });
        let foundClass = user.classes.id(id);

        if (req.isAuthenticated()) {
            req.user.enrolledClasses.forEach(enrolledClass => {
                if (enrolledClass.data.classId == foundClass._id) {
                    req.session.paymentDetails = undefined;
                    res.redirect('/dashboard')
                }
            });
            req.session.paymentDetails = {
                status: "free",
                classId: foundClass._id,
                class_title: foundClass.title,
                class_description: foundClass.description,
                userId: user._id,
            };
            res.redirect('/dashboard');
        }
        else {
            res.redirect('/login');
        }

    } catch (error) {
        console.log(error);
    }

});

app.get('/student-dashboard', async function (req, res) {
    if (req.isAuthenticated()) {
        const classId = req.query.class;
        const userId = req.query.tutor;

        try {
            let user = await User.findById(userId);

            let foundClass = user.classes.id(classId);
            res.render('student-dashboard', { classes: foundClass, tutor: user, user: req.user });
        } catch (error) {
            console.log(error);
        }

    } else {
        res.redirect('/login')
    }

});
app.get('/student/:classId/curriculum/:lessonNumber', async function (req, res) {
    const classId = req.params.classId;
    const number = req.params.lessonNumber;
    const tutorId = req.query.user;
    console.log(number);
    if (req.isAuthenticated()) {
        let tutor;
        let foundClass;
        try {
            tutor = await User.findById(tutorId);
            foundClass = tutor.classes.id(classId);
        } catch (error) {
            console.log(error);
        }

        if (number > foundClass.lesson.length || number == 0 || typeof foundClass.lesson == undefined || foundClass.lesson == null) {
            console.log('here');
            req.flash('info', 'There are no lessons set by the tutor yet! Please contact the tutor to make changes')
            res.redirect('back')
        } else {
            const lesson = foundClass.lesson[number - 1];
            console.log(lesson);
            res.render('tutor-assignments', {
                isTutor: false,
                classes: foundClass,
                lesson: lesson,
                currentNumber: number,
                tutor: tutor,
                user: req.user,
                numberOflessons: foundClass.lesson.length
            });
        }

    } else {
        res.redirect('/login');
    }
});

app.get('/student-assignment', async function (req, res) {
    const userId = req.query.tutor;
    const classId = req.query.class;
    if (req.isAuthenticated()) {
        try {
            let user = await User.findById(userId);

            let foundClass = user.classes.id(classId);
            res.render('student-assignment', { classes: foundClass, tutor: user, user: req.user })

        } catch (error) {
            console.log(error);
        }

    } else {
        res.redirect('/login')
    }

});
app.get('/submitted-assignments', async function (req, res) {
    const classId = req.query.class;
    if (req.isAuthenticated()) {
        try {
            let user = await User.findById(req.user._id);

            let foundClass = user.classes.id(classId);
            res.render('assignment-list', { classes: foundClass, tutor: user, user: req.user })

        } catch (error) {
            console.log(error);
        }

    } else {
        res.redirect('/login')
    }

});

app.get('/payments', function (req, res) {
    const bankCode = req.query.bankCode;
    const accountNumber = req.query.account;
    const secret = process.env.PAYSTACK_KEY;

    const options = {
        url: `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${secret}`
        }
    }
    let newData;
    if (req.isAuthenticated()) {
        if (bankCode != null && accountNumber != null) {
            request(options, async function (err, resp, body) {
                const newBody = JSON.parse(body);
                if (!err) {
                    if (resp.statusCode != 200) {

                        req.flash('error', newBody.message);
                        res.redirect('/payments');
                    } else {
                        try {

                            let user = await User.findById(req.user._id);
                            let newOptions = {
                                url: 'https://api.paystack.co/subaccount',
                                headers: {
                                    Authorization: `Bearer ${secret}`,
                                    'Content-Type': 'application/json'
                                },
                                form: {
                                    business_name: `Akilli_${req.user.username}`,
                                    bank_code: bankCode,
                                    account_number: accountNumber,
                                    percentage_charge: 20
                                }
                            }
                            request.post(newOptions, function (err, resp, body) {
                                if (!err) {

                                    newData = newBody.data;
                                    newData.bankCode = bankCode
                                    user.accountDetails = newData;
                                    user.subaccountDetails = (JSON.parse(body)).data;
                                    user.save(function (err) {
                                        if (!err) {
                                            req.flash('success', 'Account has been verified and created. You can now receive payments');
                                            res.redirect('/payments')
                                        }
                                    });

                                } else {
                                    console.log(err);
                                    req.flash('error', 'There has been an error creating your account');
                                    res.redirect('/payments');
                                }
                            })

                        } catch (error) {
                            console.log(error);
                        }
                    }
                } else {
                    req.flash('error', err.message);
                    res.redirect('/payments');
                    console.log(err);
                }
            })
        } else {
            console.log(req.user.subaccountDetails != {} && typeof req.user.subaccountDetails != 'undefined');
            res.render('payments', { user: req.user, isVerified: (req.user.subaccountDetails != {} && typeof req.user.subaccountDetails != 'undefined') ? true : false });
        }


    } else {
        res.redirect('/login')
    }
});

app.get('/enroll', async function (req, res) {
    const id = req.query.class_select;
    const username = req.query.user;

    let user;
    let studentUser;
    try {
        user = await User.findOne({ username: username });
        let foundClass = user.classes.id(id);
        if (req.isAuthenticated()) {
            studentUser = await User.findOne(req.user._id);
            if(studentUser.enrolledClasses != null || studentUser.enrolledClasses != []){
                studentUser.enrolledClasses.forEach(enrolled => {
                    if (enrolled.data.classId == id && studentUser != undefined) {
                        res.render('student-dashboard', { classes: foundClass, tutor: user, user: req.user });
                    } 
                });
            }
            if(req.user.username == username){
                req.flash('error', 'Nice Try! You cannot enroll for your own class');
                res.redirect(`/user/${user.username}`)
            }else{
                res.render('enrollment', { user: user, foundClass: foundClass, isAuthenticated: req.isAuthenticated() });
            }
        } else {
            res.render('enrollment', { user: user, foundClass: foundClass, isAuthenticated: req.isAuthenticated() });
        }

    } catch (error) {
        console.log(error);
    }

});

app.get('/verify_transaction', async function (req, res) {
    const username = req.query.refp;
    const reference = req.query.reference;
    console.log(reference);
    const secret = process.env.PAYSTACK_KEY;
    let user;
    const options = {
        url: `https://api.paystack.co/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${secret}`
        }
    }

    request(options, async function (err, resp, body) {
        if (!err) {
            if (resp.statusCode == 200) {
                const newBody = JSON.parse(body);

                req.session.paymentDetails = {
                    status: newBody.data.status,
                    reference: newBody.data.reference,
                    amount: newBody.data.amount,
                    classId: newBody.data.metadata.class_id,
                    class_title: newBody.data.metadata.class_title,
                    class_description: newBody.data.metadata.class_description,
                    userId: newBody.data.metadata.user_id,
                    email: newBody.data.customer.email,
                    subaccountCode: newBody.data.subaccount.subaccount_code
                };

                if (req.isAuthenticated()) {
                    res.redirect('/dashboard')
                } else {
                    res.redirect('/signup');
                }
            }
        }
    })

});

app.get('/user/:username', async function (req, res) {
    let user;
    try {
        user = await User.findOne({ username: req.params.username });
    } catch (error) {
        console.log('User does not exist');
        res.redirect('/')
    }

    res.render('landing-page', { user: user, isAuthenticated: (req.isAuthenticated()) })
});



app.post('/signup', async function (req, res) {
    var isActive = req.session.isActive = false;
    let user;
    try {
        user = await User.register({ username: req.body.username }, req.body.password);

    } catch (error) {
        console.log(error);
        req.flash('error', 'Error Occurred');
        res.redirect('/signup');
    }
    if (isActive) {
        passport.authenticate('local')(req, res, function () {
            res.redirect('/');
        });
    } else {
        let token = crypto.randomBytes(20);
        let emailUser = await User.findOne({ username: req.body.username });
        if (!emailUser) {
            req.flash('error', 'No account with that email address exists.');
            res.redirect('/signup');
        }
        user.email = req.body.email;
        user.emailConfirmationToken = token;
        user.emailConfirmationExpires = Date.now() + 86400000; // 1 hour
        await user.save();
        passport.authenticate('local')(req, res, function () {
            res.redirect('/dashboard');
        });

    }
    //     var options = {
    //         host: 'smtp-relay.sendinblue.com',
    //         port: 587,
    //         secure: true,
    //         auth: {
    //             user: process.env.SENDGRID_USERNAME,
    //             pass: process.env.SENDGRID_PASSWORD
    //         }
    //     }
    //     var client = nodemailer.createTransport(options);

    //     var email = {
    //         from: 'danielogbuti@gmail.com',
    //         to: req.body.email,
    //         subject: 'Confirm your email address',
    //         text:
    //             'Please click on the following link, or paste this into your browser to confirm your email address:\n\n' +
    //             'http://' + req.headers.host + '/confirm/' + token + '\n\n' +
    //             'If you did not request this, please ignore this email',

    //     };

    //     try {
    //         let info = await client.sendMail(email);
    //         user.save(function () {
    //             req.flash('info', 'An e-mail has been sent to ' + req.body.email + ' with further instructions.');
    //             console.log('Message sent: ' + info.response);
    //             res.redirect('back');
    //         });
    //     } catch (error) {
    //         console.log(err);
    //         req.flash('error', 'Error Occured in sending email');
    //         res.redirect('back');
    //     }
    // }
});
// User.register({ username: req.body.username }, req.body.password, function (err, user) {
//     if (err) {
//         console.log(err);
//         req.flash('error', 'Error Occurred');
//         res.redirect('/signup');
//     } else {
//         if (isActive) {
//             passport.authenticate('local')(req, res, function () {
//                 res.redirect('/');
//             });
//         } else {
//             console.log(isActive);
//             // 
//             crypto.randomBytes(20, function (err, buf) {
//                 var token = buf.toString('hex');
//                 console.log(token);
//                 User.findOne({ username: req.body.username }, function (err, user) {
//                     if (!user) {
//                         req.flash('error', 'No account with that email address exists.');
//                         res.redirect('/signup');
//                     }

//                     user.email = req.body.email;
//                     user.emailConfirmationToken = token;
//                     user.emailConfirmationExpires = Date.now() + 86400000; // 1 hour


//                     var options = {
//                         host: 'smtp-relay.sendinblue.com',
//                         port: 587,
//                         secure: true,
//                         auth: {
//                             user: process.env.SENDGRID_USERNAME,
//                             pass: process.env.SENDGRID_PASSWORD
//                         }
//                     }



//                     var client = nodemailer.createTransport(options);

//                     var email = {
//                         from: 'danielogbuti@gmail.com',
//                         to: req.body.email,
//                         subject: 'Confirm your email address',
//                         text:
//                             'Please click on the following link, or paste this into your browser to confirm your email address:\n\n' +
//                             'http://' + req.headers.host + '/confirm/' + token + '\n\n' +
//                             'If you did not request this, please ignore this email',

//                     };

//                     client.sendMail(email, function (err, info) {

//                         if (err) {
//                             console.log(err);
//                             req.flash('error', 'Error Occured in sending email');
//                             res.redirect('back');
//                         }
//                         else {
//                             user.save(function () {
//                                 req.flash('info', 'An e-mail has been sent to ' + req.body.email + ' with further instructions.');
//                                 console.log('Message sent: ' + info.response);
//                                 res.redirect('back');
//                             });
//                         }
//                     });
//                 });
//             });
//         }
//     }
// });
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
                    User.findOne({ username: user.username }, function (err, foundUser) {
                        res.redirect('/dashboard')
                        // if (foundUser.active) {
                        //     res.redirect('/dashboard');
                        // } else {
                        //     req.flash('error', 'Please confirm your email address');
                        //     res.redirect('/login')
                        // }
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

app.post('/student-assignment', async function (req, res) {
    const questionId = req.body.questionId;
    const tutorId = req.body.tutorId
    const classId = req.body.classId
    const foundAnswer = req.body.answer;

    let tutor = await User.findById(tutorId);
    let foundClass = tutor.classes.id(classId);
    let question = foundClass.assignments.id(questionId);

    let answer = new Answer({
        studentId: req.user.username,
        classId: foundClass,
        answer: foundAnswer
    });

    question.answer.push(answer);
    tutor.save(function (err) {
        if (!err) {
            req.flash('info', 'Answer has been submitted')
            res.redirect('back');
        } else {
            req.flash('error', 'Answer could not be submitted');
            res.redirect('back');
        }
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

        if (req.body.delete == 'delete') {
            foundLesson.remove();
            user.save(function (err) {
                if (!err) {
                    res.redirect('/view-curriculum');
                } else {
                    console.log(err);
                }
            })
        } else {
            res.render('create-lesson', { lesson: foundLesson, classes: foundClass, isEdit: true })
        }
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
                                    });
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
                                res.redirect('/view-curriculum')
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
                        res.redirect('/dashboard');
                    } else {
                        console.error(err);
                        res.redirect('/dashboard')
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
                    res.redirect('/dashboard');
                });
            } else {
                console.log(err);
                res.redirect('back');
            }
        });
    }
});

app.post('/assignment', async function (req, res) {
    let foundClass;
    let user;
    let assignment;

    if (req.body.delete == 'delete') {
        const assignmentId = req.body.assignmentId;
        let usedClass;
        try {
            user = await User.findById(req.user._id);
            const foundClassId = req.session.class._id;
            usedClass = user.classes.id(foundClassId);

            const foundAssignment = usedClass.assignments.id(assignmentId);
            foundAssignment.remove();
            user.save(function (err) {
                if (!err) {
                    res.redirect('/assignment');
                } else {
                    console.log(err);
                    res.redirect('/assignment');
                }
            });
        } catch (error) {
            console.log(error);
            res.redirect('/assignment');
        }


    }


    const numberOfQuestions = parseInt(req.body.number);
    for (let index = 1; index < numberOfQuestions; index++) {
        const questionInput = "questionInput" + index
        const question = req.body[questionInput];
        const radioOption = req.body["questionRadio" + index];



        try {
            user = await User.findById(req.user._id)
            const foundClassId = req.session.class._id;
            foundClass = user.classes.id(foundClassId);

        } catch (error) {
            console.log(error);

        }


        console.log("option1" + index);
        const option1 = "option1" + index;
        const option2 = "option2" + index;

        assignment = new Assignment({
            question: question,
            type: "text"
        });


        if (assignment != null && assignment != undefined) {
            foundClass.assignments.push(assignment);
            user.save();
            // res.redirect('/assignment');
            if (index == (numberOfQuestions - 1)) {
                res.redirect('/assignment');
            }

        }
    }

});

app.post('/resources', upload.single('class-resources'), async function (req, res) {
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
})

app.post('/class', function (req, res) {
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
});
app.post('/contact', function (req, res) {
    const name = req.body.name;
    const message = req.body.message;
    console.log(req.body['g-recaptcha-response']);
    if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        return res.json({ "responseError": "something goes to wrong" });
    }
    const secretKey = process.env.RECAPTCHA_SECRET;

    const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
    var options = {
        host: 'smtp.mailgun.org',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SENDGRID_USERNAME,
            pass: process.env.SENDGRID_PASSWORD
        }
    }

    request(verificationURL, function (error, response, body) {
        body = JSON.parse(body);

        if (body.success !== undefined && !body.success) {
            return res.json({ "responseError": "Failed captcha verification" });
        }
        var client = nodemailer.createTransport(options);

        var email = {
            from: 'danielogbuti@gmail.com',
            to: 'danielogbuti@gmail.com',
            subject: 'Customer Message',
            text:
                'This is the customer message\n\n' +
                message + `${name} sent the message`,

        };

        client.sendMail(email, function (err, info) {

            if (err) {
                console.log(err);
                req.flash('error', 'Error Occured in sending email');
                res.redirect('back');
            }
            else {

                req.flash('info', 'An e-mail has been sent to support successfully');
                console.log('Message sent: ' + info.response);
                res.redirect('back');
            }
        });
    })

})

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.use(function (req, res) {
    res.status(404);
    res.render('404');

});
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

app.listen(3000, function () {
    console.log('Server started at port 3000');
});