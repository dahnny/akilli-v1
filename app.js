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
var http = require('http');
var url = require('url') ;
const mg = require('nodemailer-mailgun-transport');


const resourcesController = require('./controllers/resourcesController');
const {postAdd, editUser} = require('./controllers/userController');
const User = require('./schemas/userSchema');
const assignmentController = require('./controllers/assignmentController');
const classController = require('./controllers/classController');
const {uploadLesson, editLesson} = require('./controllers/lessonController');   



// Local lib
const upload = require('./helpers/storage').upload;

const app = express();

mongoose.connect(`mongodb+srv://danny:${process.env.MONGO_PASSWORD}@cluster0.j8grj.mongodb.net/akilliDB?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true });
// mongoose.connect('mongodb://localhost:27017/akilliDB', { useNewUrlParser: true, useUnifiedTopology: true });


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




const {assignmentSchema} = require('./schemas/assignmentSchema');
const userController = require('./controllers/userController');
const fileSchema = require('./schemas/fileSchema').fileSchema;
const enrolledSchema = require('./schemas/enrolledSchema').enrolledSchema;
const answerSchema = require('./schemas/answerSchema').answerSchema;




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
            if(req.user.username == username){
                req.flash('error', 'Nice Try! You cannot enroll for your own class');
                res.redirect(`/user/${user.username}`)
            }else{
                req.session.paymentDetails = {
                    status: "free",
                    classId: foundClass._id,
                    class_title: foundClass.title,
                    class_description: foundClass.description,
                    userId: user._id,
                };
                res.redirect('/dashboard');
            }
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
    let hostname = req.headers.host;
    try {
        user = await User.findOne({ username: username });
        let foundClass = user.classes.id(id);
        if (req.isAuthenticated()) {
            studentUser = await User.findOne(req.user._id);
            if(studentUser.enrolledClasses != null || studentUser.enrolledClasses != []){
                studentUser.enrolledClasses.forEach(enrolled => {
                    if (enrolled.data.classId == id && studentUser != undefined) {
                        res.render('student-dashboard', { classes: foundClass, tutor: user, user: req.user, hostname: hostname });
                    } 
                });
            }
            if(req.user.username == username){
                req.flash('error', 'Nice Try! You cannot enroll for your own class');
                res.redirect(`/user/${user.username}`)
            }else{
                res.render('enrollment', { user: user, foundClass: foundClass, isAuthenticated: req.isAuthenticated(), hostname: hostname });
            }
        } else {
            res.render('enrollment', { user: user, foundClass: foundClass, isAuthenticated: req.isAuthenticated(), hostname: hostname });
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
            }else{
                console.log(resp)
            }
        }else{
            console.log(err)
        }
    })

});

app.get('/user/:username', async function (req, res) {
    let user;
    let hostname = req.headers.host
    try {
        user = await User.findOne({ username: req.params.username });
    } catch (error) {
        console.log('User does not exist');
        res.redirect('/')
    }

    res.render('landing-page', { user: user, isAuthenticated: (req.isAuthenticated()), hostname: hostname })
});



app.post('/signup', async function (req, res) {
    var isActive = req.session.isActive = false;
    let user;
    try {
        user = await User.register({ username: req.body.username.toLowerCase() }, req.body.password);
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

app.post('/user', upload.single('profile-image'),editUser);


app.post('/edit-lesson', upload.single('edited-lesson-video'),editLesson)

app.post('/upload-lesson', upload.single('lesson-video'), uploadLesson);

app.post('/class-info', classController.classInfo);

app.post('/assignment',assignmentController.assignment);

app.post('/resources', upload.single('class-resources'), resourcesController.resources)

app.post('/class', require('./controllers/userController').postAdd);
app.post('/contact', require('./controllers/contactController').contact);

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
const port = process.env.PORT || 3000
app.listen(port, function () {
    console.log(`Server started on ${port}`);
});