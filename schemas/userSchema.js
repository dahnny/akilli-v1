const mongoose = require('mongoose');
const {classSchema} = require('./classSchema')
const enrolledSchema = require(__dirname + '/enrolledSchema.js').enrolledSchema;
const passportLocalMongoose = require('passport-local-mongoose');


const userSchema = new mongoose.Schema({
    username: {type: String, unique: true },
    email: {type: String, unique : true },
    active: {type:Boolean, default : false},
    emailConfirmationToken: String,
    emailConfirmationExpires:String,
    password: String,
    date: Date,
    profileImage: Buffer,
    bio: String,
    accountDetails: {},
    subaccountDetails:{},
    classes : [classSchema],
    enrolledClasses: [enrolledSchema],
});

userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model('User', userSchema);

module.exports = User;