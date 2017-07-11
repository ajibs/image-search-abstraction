'use strict';

var express = require('express');
var app = express();

var mongo = require('mongodb').MongoClient;
var config = require('./config.js');


// axios for http requests
var axios = require('axios');
var url = 'https://www.googleapis.com/customsearch/v1?key=' + config.search.key + '&cx=' + config.search.engine + '&q=';



// database
var mLab = 'mongodb://' + config.db.host + config.db.name;


function getData(string, res){
	axios.get(url + string).then( response => {
		let result = response.data.items;
		
		// store results to be displayed
		let allResult = [];
		

		result.forEach(function(value){
			// check for image
			if (value.pagemap.cse_image){
				let firstResult = {};
				firstResult.image = value.pagemap.cse_image[0].src; 
				firstResult.page = value.link;
				firstResult.snippet = value.snippet;
				allResult.push(firstResult);
			}
		});	
		
		// send results to browser;
		res.json(allResult);

		storeData(string);

	}).catch( error => console.log(error) );
}


// store search string in db
function storeData(query){
	mongo.connect(mLab, function(err, db){
		if(err){
			console.log('Unable to connect to server.')
		} else{
			console.log('connected to server');
			let collection = db.collection('imagesearch');
			collection.insert({'term': query, 'when': new Date()});
		}
		db.close();
	});

}


// set port
app.set( 'port', ( process.env.PORT || 5000 ) );

// define static file paths
app.use( express.static( __dirname + '/views') );


// route for home page
app.get('/', function (req, res){
	res.sendFile('index.html');
})



// route for image search
app.get('/api/imagesearch/:query', function (req, res){
	let query = req.params.query;
	getData(query, res);
});



// route for retrieving recently searched images
app.get('/api/latest/imagesearch', function(req, res){
	
	// connect to database
	mongo.connect(mLab, function(err, db){
		if (err){
			console.log('Unable to connect to server');
		} else {
			console.log('Connected to server');

			let collection = db.collection('imagesearch');
			
			// find most recent documents from latest to oldest, limit to '10' results
			let answer = collection.find( {}, {_id: 0} ).sort( {_id: -1} ).limit(10);

			answer.toArray( (err, doc) => {
				if (err){
					throw err;
				}else {
					// send doc response to browser
					res.json(doc);
				}

				db.close();
			} );
		}
	
	});

});


app.listen( app.get('port'), function(){
	console.log( 'Node app is running on port ', app.get('port') );	
});