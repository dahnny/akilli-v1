const express = require('express');
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', function(req, res){
    res.render('home')
});

app.get('/about', function(req, res){
    res.render('about')
});

app.get('/contact', function(req, res){
    res.render('contact');
});

app.get('/login', function(req, res){
    res.render('login')
});

app.get('/signup', function(req, res){
    res.render('signup');
})

app.listen(3000, function(){
    console.log('Server started at port 3000');
});