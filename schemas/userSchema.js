const mongoose = require('mongoose');
const classSchema = require(__dirname + '/classSchema.js').classSchema;
const enrolledSchema = require(__dirname + '/enrolledSchema.js').enrolledSchema;



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

exports.userSchema = userSchema;