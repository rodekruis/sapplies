'use-strict';

// Setup the required node modules and config files
var express = require('express'),
    app = express(),
    mongo = require('mongoskin'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    bodyParser = require('body-parser'),
    config = require('./config/config.js'),
    secrets = require('./config/secrets.json');

// ObjectID for casting a number in an ObjectID
var ObjectID = mongo.ObjectID;

// BodyParser for getting the POST-values in JSON
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Use directories for the client
app.use(express.static(__dirname + '/app'));
app.use(express.static(__dirname + '/fb'));

/*
To run local use http://localhost instead of https. Otherwise ssl error.
Comment app.enable('trust proxy'); and the app.use(function(req, res, next) function
*/
if(process.env.NODE_ENV === 'production') {

   // Enable reverse proxy
   app.enable('trust proxy');

   // Redirect all http requests to https
   // If environment is development, remove the port
   app.use(function(req, res, next) {
   	var protocol = req.protocol;
   	if (config.usessl) {
   		if (!req.secure) {
   		    if(process.env.NODE_ENV === 'development') {
   		      return res.redirect('https://localhost' + req.url);
   		    } else {
   		      return res.redirect('https://' + req.headers.host + req.url);
   		    }
   		} else {
   		    return next();
   		}
   	} else {
   		return next();
   	}
   });
}

// Set a prefix for the REST API
var apiPrefix = '/api/v1';

// Create a db connection using the node module mongoskin
var db = mongo.db("mongodb://localhost:27017/sapplies", {native_parser:true});

// Bind all the collections to the db
db.bind('offers');
db.bind('needs');
db.bind('categories');
db.bind('matches');
db.bind('fbusers');

// Root uri for the Angular webapp
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/app/index.html');
});

// Root uri for the FB-app
app.get('/fb/', function(req, res) {
  res.sendfile(__dirname + '/fb/index.html');
});

// Post route required for embedding in Facebook
app.post('/fb/', function(req, res) {
   res.sendfile(__dirname + '/fb/index.html');
});

/*
 * CRUD: Needs
 */

// FIND
app.get(apiPrefix+'/needs', function(req, res) {
   db.needs.find().sort({_id:-1}).toArray(function(err, docs) {
      if(err) throw err;
      res.send(docs);
   });
});

// FIND ONE
app.get(apiPrefix+'/needs/:id', function(req, res) {
  //req.params.id
  db.needs.findOne({ _id: new ObjectID(req.params.id) }, function(err, docs) {
    if(err) throw err;
    res.send(docs);
  });
});

// CREATE
app.post(apiPrefix+'/needs', function(req, res) {
  db.needs.insert(req.body, function(err, docs) {
    if(err) throw err;
    console.log(docs);
    res.send(200);
  });
});

// DELETE
app.delete(apiPrefix+'/needs/:id', function(req, res) {
  //req.params.id
  db.needs.remove({ _id: new ObjectID(req.params.id) }, function(err, docs) {
    if(err) throw err;
    res.send(docs);
  });
});

/*
 * CRUD: Offers
 */

 // FIND
app.get(apiPrefix+'/offers', function(req, res) {
	db.offers.find().sort({_id:-1}).toArray(function(err, docs) {
   if(err) throw err;
   res.send(docs);
 });
});

// FIND ONE
app.get(apiPrefix+'/offers/:id', function(req, res) {
  db.offers.findOne({ _id: new ObjectID(req.params.id) }, function(err, docs) {
    if(err) throw err;
    res.send(docs);
  });
});

// CREATE
app.post(apiPrefix+'/offers', function(req, res) {
  db.offers.insert(req.body, function(err, docs) {
    if(err) throw err;
    res.send(200);
  });
});

// UPDATE
app.put(apiPrefix+'/offers/:id', function(req, res) {
   db.offers.update({ _id: new ObjectID(req.params.id)}, { $set: req.body }, function(err, docs) {
      if(err) throw err;
      res.send(200);
   });
});

// DELETE
app.delete(apiPrefix+'/offers/:id', function(req, res) {
  //req.params.id
  db.offers.remove({ _id: new ObjectID(req.params.id) }, function(err, docs) {
    if(err) throw err;
    res.send(docs);
  });
});

/*
 * CRUD: Matches
 */

app.post(apiPrefix+'/matches', function(req, res) {
   var postData = req.body;

   db.matches.find({ "need.title": postData.need.title}).count(function(err, c) {
      if(c == 0) {
         db.matches.insert(postData, function(err, docs) {
            if(err) throw err;
            res.send(200);
         });
      } else {
         db.matches.update({ "need.title": postData.need.title}, { $push: { offers: { $each: postData.offers }}}, function(err, docs) {
            if(err) throw err;
            res.send(200);
         });
      }
   });
});

// FIND
app.get(apiPrefix+'/matches', function(req, res) {
   db.matches.find().sort({ id: -1 }).toArray(function(err, docs) {
      if(err) throw err;

      // var representation = docs;
      // docs.forEach(function(match, i) {
      //    db.needs.findOne({ _id: match.need }, function(err, n) {
      //       representation[i].need = n;
      //       db.offers.findOne({ _id: match.offer }, function(err, o) {
      //          representation[i].offer = o;
      //
      //          // Dirty: bit of a hack
      //          if(i == representation.length-1) {
      //             res.send(representation);
      //          }
      //       });
      //    });
      // });
      res.send(docs);
   });
});

/*
 * Categories
 */

// FIND
app.get(apiPrefix+'/categories', function(req, res) {
   db.categories.find().sort({ name: 1 }).toArray(function(err, docs) {
      if(err) throw err;
      res.send(docs);
   });
});

/*
 * Facebook users
 */
// FINE ONE
app.get(apiPrefix+'/fbusers/:id', function(req, res) {
   db.fbusers.findOne({ userID: req.params.userID }, function(err, docs) {
      if(err) throw err;
      res.send(docs);
   });
});

// Save to the database if not already exists (upsert true)
app.put(apiPrefix+'/fbusers/:userID', function(req, res) {
   console.log(req.params);
   db.fbusers.update({ userID: req.params.userID }, { userID: req.params.userID }, { upsert: true }, function(err, docs) {
      if(err) throw err;
      res.send(200);
   });
});

// A route for resetting the database and injecting fake data
app.get(apiPrefix+'/resetdb', function(req, res) {

   db.needs.remove({}, function() {});
   db.offers.remove({}, function() {});
   db.matches.remove({}, function() {});
   db.categories.remove({}, function() {});
   db.fbusers.remove({}, function() {});

   db.needs.insert([
      { title : "Helpen met klussen", description : "Er is iemand nodig om te helpen met klussen.", category : "Bouw", type: "Diensten" },
      { title : "Tweepersoonsbank", description : "Het liefst een bank die ook te demonteren is.", category : "Meubilair", type: "Goederen" },
      { title : "Keukengerei", description : "Diverse keukenhulpmiddelen zijn nodig. Bestek, pannen, borden, koppen en mokken.", category : "Keuken", type: "Goederen" },
      { title : "Vervangde laptop", description : "Een tijdelijk laptop waarop internetverbinding werkt.", category : "Electronica", type: "Goederen" }
   ], function(err, docs) {
      if(err) throw err;
   });

   db.offers.insert([
      { title: "Ik kan helpen met het leggen van laminaat", description: "Op woensdagen zou ik kunnen komen helpen", category: "Bouw", type: "Diensten", userID: "915046055178662"},
      { title: "Leren fauteuil met uiklapbaar voetenbankje", description: "Weegt ongeveer 15kg in de kleur bruin", category: "Meubilair", type: "Goederen", userID: "915046055178662"},
      { title: "Pannenset van Ikea", description: "De pannen passen in elkaar.", category: "Keuken", type: "Goederen", userID: "915046055178662"},
      { title: "Kluservaring", description: "Ik heb ervaring met het monteren en verbouwen van keukens.", category: "Keuken", type: "Diensten", userID: "915046055178662"},
      { title: "Bordenset", description: "Het zijn witte diepe borden", category: "Keuken", type: "Diensten", userID: "915046055178662"},
      { title: "Koken", description: "Iedere dinsdag en donderdag biedt ik mij aan om een maaltijd voor te bereiden", category: "Maaltijden", type: "Diensten", userID: "915046055178662"},
   ], function(err, docs) {
      if(err) throw err;
   });

   db.categories.insert([
      { type: 'Goederen', name: "Algemeen"},
      { type: 'Goederen', name: "Kleding"},
      { type: 'Goederen', name: "Hygiëne"},
      { type: 'Goederen', name: "Voedsel"},
      { type: 'Goederen', name: "Electronica"},
      { type: 'Goederen', name: "Maaltijden"},
      { type: 'Goederen', name: "Meubilair"},
      { type: 'Goederen', name: "Gereedschap"},
      { type: 'Goederen', name: "Speelgoed"},
      { type: 'Goederen', name: "Keuken"},
      { type: 'Diensten', name: "Onderdak"},
      { type: 'Diensten', name: "Elektricien"},
      { type: 'Diensten', name: "Loodgieter"},
      { type: 'Diensten', name: "Bouw" },
      { type: 'Diensten', name: "Financieel"},
      { type: 'Diensten', name: "Juridisch"},
      { type: 'Diensten', name: "Medische begeleiding"},
      { type: 'Diensten', name: "Vertaling"},
      { type: 'Diensten', name: "Vervoer"},
   ], function(err, docs) {
      if(err) throw err;
   });
   res.send(200);
});

// Close the db connection
db.close();

/* Get Facebook app acces token server side. Because it is

/*
 * HTTPS and SSL configuration
 * Set certicicates and start SSL server
 */
if (config.usessl) {

  var sslconfig = {};
  if(config.hasOwnProperty('pfx_file')){
    sslconfig.pfx = fs.readFileSync(path.resolve(__dirname, config.pfx_file), 'UTF-8');
  }
  else if (config.hasOwnProperty('key_file') && config.hasOwnProperty('cert_file')){
    sslconfig.key = fs.readFileSync(path.resolve(__dirname, config.key_file), 'UTF-8');
    sslconfig.cert = fs.readFileSync(path.resolve(__dirname, config.cert_file), 'UTF-8');
  }

  if(secrets.certificate.passphrase) {
    sslconfig.passphrase = secrets.certificate.passphrase;
  }

  https.createServer(sslconfig, app).listen(config.sslport);

  // https start
  console.log('Application started on port ' + config.sslport);
}

// http start as well
console.log('Application started on port ' + config.mainPort);
app.listen(config.mainPort);
