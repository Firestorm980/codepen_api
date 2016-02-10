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
								 	
								 	description = $title.attr('title'),

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
									description: description,
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

		var 
			username = ( req.params.user ) ? req.params.user : false,
			id = ( req.params.id ) ? req.params.id : false,
			include_comments = ( req.query.comments === 'true' ) ? true : false,
			url = base_url + username + '/details/' + id + '/',
			data = {};

		if ( !username || !id ){
			send_error( res, 'A username and valid pen ID is required.');
		}
		else {
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
					var $ = cheerio.load(body);
					
					var $all_details = $('.all-details');

					var title = $all_details.find('#details-title').text().trim();

					var $author = $all_details.find('.details-meta').find('a');
					var author_name = $author.text().trim();
					var author_link = base_url + $author.attr('href').replace('/', '');

					var $description = $all_details.find('.pen-description');
					var description_html = $description.html().trim();
					var description_text = $description.text().trim();

					var $dateline = $all_details.find('.dateline time');
					var created_at = $dateline.attr('datetime');

					var $stats = $('#pen-stat-numbers');
					var views_stat = parseInt( $stats.find('li').eq(0).find('strong').text().trim() );
					var comments_stat = parseInt ( $stats.find('li').eq(1).find('strong').text().trim() );
					var loves_stat = parseInt( $stats.find('li').eq(2).find('strong').text().trim() );

					var tags_data = [];
					var $tags = $all_details.find('.tag-grid li');

					var comments_data = [];
					var $comments = $('#comment-list li');

					if ( include_comments ){
						$comments.each(function(index, el) {
							var
								$comment = $(this),
								
								$user = $comment.find('.comment-user'),
								comment_user = $user.find('.comment-username').attr('data-username'),
								comment_user_link = base_url + $user.find('.comment-username').attr('href').replace('/',''),
								comment_user_avatar = $user.find('.comment-avatar').attr('src'),

								comment_created_at = $comment.find('.block-comment-time').text().trim(),

								comment_id = $comment.attr('id').replace('comment-id-',''),
								comment_hash_id = $comment.find('.loves').attr('data-hashid'),
								comment_link = $user.find('.comment-username').next('a').attr('href'),

								comment_text = $comment.find('.comment-text').html().trim();

							comments_data.push({
								id: comment_id,
								hash: comment_hash_id,
								link: comment_link,
								content: comment_text,
								user: {
									name: comment_user,
									avatar: comment_user_avatar,
									link: comment_user_link
								}
							});
						});
					}
					$tags.each(function(index, el) {
						var 
							$tag = $(this),
 							tag_name = $tag.find('a').text().trim(),
 							tag_link = base_url + $tag.find('a').attr('href').replace(/^\//,"");

 						tags_data.push({
 							name: tag_name,
 							link: tag_link
 						});
					});	


					data = {
						id: id,
						title: title,
						links: {
							editor: base_url + username + '/pen/' + id + '/',
							details: base_url + username + '/details/' + id + '/',
							full: base_url + username + '/full/' + id + '/',
							presentation: base_url + username + '/pres/' + id + '/'
						},
						description: {
							html: description_html,
							text: description_text
						},
						author: {
							link: author_link, 
							name: author_name
						},
						created_at: created_at,
						stats: {
							views: views_stat,
							comments: comments_stat,
							loves: loves_stat
						},
						tags: tags_data
					};

					if ( include_comments ){
						data.comments = comments_data;
					}

					res.send({
						success: true,
						data: data
					});

				}

			});
		}
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
						success: true,
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