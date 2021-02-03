const nodemailer = require('nodemailer');

var options = {
    service: 'SendInBlue',
    auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD
    }
}
var client = nodemailer.createTransport(options);

module.exports = client;