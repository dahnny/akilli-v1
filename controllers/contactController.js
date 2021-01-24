

const contactController = {
    contact: async (req, res)=>{
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
        });   
    }
}

module.exports = contactController;