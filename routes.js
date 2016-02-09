var appRouter = function(app) {
 	// Base URL for codepen
	var base_url = 'http://codepen.io/';
	var request = require("request"); // Request various URLs from Codepen
	var cheerio = require("cheerio"); // Scrape our responses from Codepen

	// Error handling standardized
	var send_error = function ( res, error ) {
		res.send({ success: false, error: error });
	};

	// Months for parsing with the date
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	/**
	 * Get a group of pens from the user.
	 */
	app.get('/pens/:type/:user', function (req, res) {
	
		var query = req.query;
		var username = ( req.params.user ) ? req.params.user : false;
		var type = ( req.params.type ) ? req.params.type : 'public';
		var url = '';
		var data = [];
		var page = 1;

		// Currently, 'showcase' would require seperate code to work.
		// So send an error for now.
		if ( type === 'showcase' ){
			send_error(res, 'Showcase type is currently not supported.');
			return;
		}

		// No username? Throw an error back.
		// Otherwise keep going.
		if ( username ){
			// Our request function.
			// So we can call it in a "loop" style fashion.
			var make_request = function () {
				/* http://codepen.io/chriscoyier/pens/public/2/?grid_type=list */
				// This url should have its page increment so we can get *all* the pens.
				url = base_url + username + '/pens/' + type + '/grid/' + page + '/?grid_type=list';

				// Make the request
				request( url, function (error, response, body) {
					// Error
					if ( error ){
						send_error(res, 'An unknown error occured in the request.');
					}
					// Error 404
					if ( response.statusCode === 404){
						send_error(res, 'Error from CodePen. Make sure you have a proper type and username.');
					}
					// No errors! Continue.
					else if ( !error && response.statusCode === 200){
						// Load our HTML response into cheerio
						var $ = cheerio.load(JSON.parse(body).page.html);
						// Get our pens
						var $pens = $('.pen-in-list-view');
						// Are there pens?
						if ( $pens.length > 0 ){
							// Loop through all pens and add their data to the array.
							$pens.each(function() {
								var 
									// The current pen
								 	$pen = $(this), 
							 		// Title element
								 	$title = $pen.find('.title'),
								 	// Link element
								 	$link = $title.find('a'),

								 	// Get the href
									link = $link.attr('href').trim(),
									// Get the ID from the href (since we don't have an attribute or ID to do it with)
									link_array = link.split('/'),
								 	id = link_array.pop(),
								 	// Get the title
								 	title = $link.text().trim(),
								 	
								 	// Get the human readable date
								 	date_string = $pen.find('.date').text().trim(),
								 	// Get the date object date
								 	date_array = date_string.replace(',','').split(' '),
								 	date_month = months.indexOf( date_array[0] ),
								 	date_year = date_array[2],
								 	date_day = date_array[1],

								 	// Get the statistical meta information
								 	comments = parseInt( $pen.find('.stat-value').eq(0).text() ),
								 	views = parseInt( $pen.find('.stat-value').eq(1).text() ),
								 	loves = parseInt( $pen.find('.stat-value').eq(2).text() ),
								 	
								 	// Get the pen images
								 	smallImg = base_url + username + "/pen/" + id + "/image/small.png",
									largeImg = base_url + username + "/pen/" + id + "/image/large.png";

								data.push({
									title: title,
									id: id,
									last_updated: {
										string: date_string,
										date: new Date( date_year, date_month, date_day )
									},
									link: link,
									comments: comments,
									views: views,
									loves: loves,
									images: {
										small: smallImg,
										large: largeImg
									}
								});
							});
							// Increment up the page for the next request
							page++;
							// Make another request
							make_request();
						}
						// There were no pens, therefore, we're done.
						else {
							// Return the pens
							if ( data.length ){
								res.send({
									success: true,
									data: data
								});
							}
							// No pens? Error.
							else {
								send_error(res, 'No pens found.');
							}							
						}
					}
				});
			};
			// Make the first request.
			// Kicks off the "loop"
			make_request();
		}
		else {
			send_error( 'Username is required.');
		}
	});

	/**
	 * Get a specific pen and its information.
	 */
	app.get('/pen/:user/:id', function (req, res) {
		res.send({
			user: req.params.user,
			id: req.params.id
		});
	});


	/**
	 * Get the user profile from CodePen
	 */
	app.get('/profile/:user', function (req, res) {
		var username = req.params.user;
		var url = base_url + username;

		if ( !username ){
			send_error( res, 'Username is required.');
		}
		else {
			request( url, function( error, response, body ){
				if( response.statusCode === 404 ){
					send_error( res, 'Error from CodePen. Make sure you have the right username.');
				}
				else if ( response.statusCode === 200 ){
					var 
						$ = cheerio.load(body),
						nicename = $('#profile-name-header').text().replace('PRO', '').trim(),
						username = $('#profile-username').text().replace('@', '').trim(),
						location = $('#profile-location').text().trim(),
						bio = $('#profile-bio').text().trim(),
						avatar = $('#profile-image').attr('src'),

						isPro = $('#profile-badge-pro').length ? true : false,
						followers = $('#followers-count').html(),
						following = $('#following-count').html(),
						links = $('.profile-links a:not(#hire-me-button)'),

						profileLinks = [],
						data = {};

					if(links.length){
						links.each(function(){
							profileLinks.push($(this).attr('href'));
						});
					}

					data = {
						nicename: nicename,
						username: username,
						avatar: avatar,
						location: location,
						bio: bio,
						pro: isPro,
						followers: followers,
						following: following,
						links: profileLinks
					};

					res.send({
						success: 'true',
						data: data
					});
				}
			});
		}

	});

	app.get('/', function(req, res, next){
		res.sendFile('./public/index.html');
	});

	app.get('*', function(req, res, next){
		var err = new Error();
		err.status = 404;
		next(err);
	});

	app.use( function(error, req, res, next ){
		if ( error.status !== 404 ){
			return next();
		}
		send_error(res, 'Not a valid API endpoint.');
	});

};
 
module.exports = appRouter;