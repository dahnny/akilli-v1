const { Lesson } = require("../schemas/lessonSchema");
const User = require("../schemas/userSchema");
const cloudinary = require("../helpers/cloudinaryConfig");
const crypto = require('crypto');


const lessonController = {
    uploadLesson: async (req, res) => {
        const title = req.body.title;
        const content = req.body.content;
        const classId = req.body.id;
        const isEdit = req.body.isEdit;
        let videoId = crypto.randomBytes(10).toString('hex')

        if (req.isAuthenticated()) {
            let user;
            try {
                user = await User.findById(req.user._id);
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
                    await user.save();
                    if (req.file) {
                        let result = await cloudinary.uploader.upload(req.file.path, {
                            resource_type: 'video', overwrite: true,
                            public_id: "lesson-video" + "/" + foundLesson.videoId
                        });                       
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
                }
            } catch (error) {

            }


            User.findById(req.user._id, function (err, user) {

                if (!err) {

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
    },

    editLesson: async (req, res)=>{
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

    }
}

module.exports = lessonController;