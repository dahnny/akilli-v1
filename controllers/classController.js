const User = require("../schemas/userSchema");
const { Class } = require("../schemas/classSchema");


const classController = {
    classInfo: async (req, res) => {
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
    }
}

module.exports = classController;