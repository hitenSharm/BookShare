require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs=require('ejs');
const mongoose=require('mongoose');
const encrypt=require('mongoose-encryption');
const passport=require('passport');
const passportLocal=require('passport-local-mongoose');
const port = 3000
const app=express();
const session=require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy; 
const findOrCreate = require('mongoose-findorcreate')

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({
    secret:"This is my secret.",
    resave:false,
    saveUnintialised:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersBook",{useNewUrlParser:true,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);


const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String
});


userSchema.plugin(passportLocal);
userSchema.plugin(findOrCreate);


const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.use(bodyParser.urlencoded({
    extended:true
}));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

app.get('/signup', (req, res) => {
  
    res.render("signup");
    
})

app.get('/home', (req, res) => {
    if(req.isAuthenticated()){
        res.send("this is the home redirect!");
    }else{
        res.send("shit");
    }

});

app.post('/register', (req, res) => {
    User.register({
        username:req.body.username,        
    },
    req.body.password,
    function(err,user){
        if(err){
            console.log(err);
             res.redirect('signup');
        }
        else{
            passport.authenticate("local")(req,res,function(){
                  res.redirect('home');   
            })
        }
    }
    );
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect('home');   
          })
        }
    })

});

app.get('/logout', (req, res) => {
    req.logout();
     res.redirect('home');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})