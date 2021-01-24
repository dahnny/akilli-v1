const User = require("../schemas/userSchema")


const assignmentController = {
    assignment: async (req, res)=>{
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
    }
}

module.exports = assignmentController;