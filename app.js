var express = require("express"); // Easily set up API endpoints
var cheerio = require("cheerio"); // Scrape our responses from Codepen
var request = require("request"); // Request various URLs from Codepen

// Use express for this stuff.
var app = express();

// These are where our various API routes will be.
var routes = require("./routes.js")(app);

// For our 'homepage', use the public directory.
// Think of it like a htdocs or www directory.
app.use('/', express.static(__dirname + '/public'));

// Start up the server.
var server = app.listen(3000, function () {
    console.log("Listening on port %s...", server.address().port);
});

