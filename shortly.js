var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var session = require('express-session');
var bodyParser = require('body-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'Keep it secret, keep it safe!',
  resave: false,
  saveUninitialized: true,
  cookie: {}
}));

app.get('/', util.checkUser, function(req, res) {
    console.log("inside 3rd argument");
    res.render('index');
});

app.get('/create', util.checkUser, function(req, res) {
  res.render('index');
});

app.get('/links', util.checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', util.checkUser, function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res){
  if(!req.body.username || !req.body.password){
    // res.send some error statuscode + msg
    res.send(400, "Must have both username and password to create an account.");
  }
  var newUser = new User({username: req.body.username, password: req.body.password});
  newUser.login(req.body.username, req.body.password).then(function(authorized){
    if(!authorized){
      res.send(404, "Username or password was incorrect");
    } else {
      // create a new session for the user
      req.session.regenerate(function(){
        // associate session with the user
        req.session.user = req.body.username;
        res.redirect('/'); //TODO: confirmation of successful login
      })
    }
  }).catch(function(err){
    res.send(404, err);
  });

})

app.get('/logout', function(req, res){
  req.session.destroy(function(){
    console.log("Ayyy lmao");
  });
  res.send(200, "Logged out successfully");
})

app.post('/signup', function(req, res) {
  // if username and password were not given
  if(!req.body.username || !req.body.password){
    // res.send some error statuscode + msg
    res.send(400, "Must have both username and password to create an account.");
  }
  // if username is already in database
  var newUser = new User({username: req.body.username});
  newUser.fetch().then(function(model){
    if(model){
    // res.send some error statuscode + msg
      res.send(400, "Must submit a unique username");
    }
    else{
      newUser.signup(req.body.username, req.body.password).then(function(user){
        res.redirect('/login'); //TODO: Add confirmation of account creation
      }).catch(function(err){
        res.send(404, err);
      });
    }
  });
});

app.get('/signup', function(req, res){
  res.render('signup');
})

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 3000');
app.listen(3000);
