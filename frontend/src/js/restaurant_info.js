import { DBHelper } from './dbhelper';
import TryServiceWorker from './all';
import loadGoogleMapsApi from 'load-google-maps-api';

let useGoogleMaps = false;
let toggleMapButton = document.getElementById('toggleMap');
let restaurant;
var map;

/**
 * Check for Service Worker in browser
 */

TryServiceWorker();

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
	fetchRestaurantFromURL((error, restaurant) => {
		if (error) {
			// Got an error!
			console.error(error);
		} else {
			self.map = new google.maps.Map(document.getElementById('map'), {
				zoom: 16,
				center: restaurant.latlng,
				scrollwheel: false
			});
			console.log(restaurant);
			DBHelper.mapMarkerForRestaurant(restaurant, self.map);
		}
	});
};

function initNoMap() {
	document.getElementById('map').style.display = 'none';
	document.getElementById('map-container').style.display = 'none';
	fetchRestaurantFromURL((error, restaurant) => {
		if (error) {
			// Got an error!
			console.error(error);
		}
		fillBreadcrumb();
	});
}

/**
 * Get current restaurant from page URL.
 */
function fetchRestaurantFromURL(callback) {
	if (self.restaurant) {
		// restaurant already fetched!
		callback(null, self.restaurant);
		return;
	}
	const id = getParameterByName('id');
	if (!id) {
		// no id found in URL
		error = 'No restaurant id in URL';
		callback(error, null);
	} else {
		DBHelper.fetchRestaurantById(id, (error, restaurant) => {
			self.restaurant = restaurant;
			if (!restaurant) {
				console.error(error);
				return;
			}
			fillRestaurantHTML();
			callback(null, restaurant);
		});
	}
}

/**
 * Create restaurant HTML and add it to the webpage
 */
function fillRestaurantHTML(restaurant = self.restaurant) {
	const name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	const address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;

	const image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img';
	image.setAttribute('alt', restaurant.name);
	image.src = DBHelper.imageUrlForRestaurant(restaurant);

	const cuisine = document.getElementById('restaurant-cuisine');
	cuisine.innerHTML = restaurant.cuisine_type;

	// fill operating hours
	if (restaurant.operating_hours) {
		fillRestaurantHoursHTML();
	}

	//Update Review button

	document
		.getElementById('add-review')
		.setAttribute('data-restaurant-id', restaurant.id);

	// Get reviews
	getReviews();
}

/**
 * Get Reviews
 */

function getReviews() {
	const id = getParameterByName('id');
	fetch(DBHelper.DATABASE_URL + `/reviews/?restaurant_id=${id}`)
		.then(res => {
			return res.json();
		})
		.then(reviewJson => {
			// fill reviews
			fillReviewsHTML(reviewJson);
		})
		.catch(err => {
			console.log('Cant get reviews', err);
		});
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
function fillRestaurantHoursHTML(
	operatingHours = self.restaurant.operating_hours
) {
	const hours = document.getElementById('restaurant-hours');
	for (let key in operatingHours) {
		const row = document.createElement('tr');
		const day = document.createElement('td');
		day.innerHTML = key;
		row.appendChild(day);

		const time = document.createElement('td');
		let opHours = operatingHours[key];
		opHours = opHours.replace(',', ', \n <br /> \n');
		time.innerHTML = opHours;
		row.appendChild(time);

		hours.appendChild(row);
	}
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
function fillReviewsHTML(reviews = self.restaurant.reviews) {
	const container = document.getElementById('reviews-container');
	const title = document.createElement('h3');
	title.innerHTML = 'Reviews';
	title.id = 'reviews-title';
	container.appendChild(title);

	if (!reviews) {
		const noReviews = document.createElement('p');
		noReviews.id = 'no-reviews';
		noReviews.innerHTML = 'No reviews yet!';
		container.appendChild(noReviews);
		return;
	}
	const ul = document.getElementById('reviews-list');
	reviews.forEach(review => {
		ul.appendChild(createReviewHTML(review));
	});
	container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
function createReviewHTML(review) {
	const li = document.createElement('li');
	const name = document.createElement('p');
	name.innerHTML = review.name;
	li.appendChild(name);

	const date = document.createElement('p');
	if (review.createdAt) {
		date.innerHTML = new Date(review.createdAt).toLocaleDateString();
	} else {
		date.innerHTML = new Date().toLocaleDateString();
	}
	li.appendChild(date);

	const rating = document.createElement('p');
	rating.innerHTML = `Rating: ${review.rating}`;
	li.appendChild(rating);

	const comments = document.createElement('p');
	comments.innerHTML = review.comments;
	li.appendChild(comments);

	return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
function fillBreadcrumb(restaurant = self.restaurant) {
	const breadcrumb = document.getElementById('breadcrumb');
	const li = document.createElement('li');
	li.setAttribute('aria-current', 'page');
	li.innerHTML = restaurant.name;
	breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Toggle Google Maps
 */

function toggleGoogleMaps() {
	useGoogleMaps = !useGoogleMaps;
	if (useGoogleMaps) {
		loadGoogleMapsApi({ key: 'AIzaSyDEHTLqQlbIc4-odc2DnMiEF2uF3arBz4s' }).then(
			() => {
				window.initMap();
				toggleMapButton.innerHTML = 'Turn Off Map';
				document.getElementById('map').style.display = 'block';
				document.getElementById('map-container').style.display = 'block';
			}
		);
	} else {
		document.getElementById('map').style.display = 'none';
		document.getElementById('map-container').style.display = 'none';
		toggleMapButton.innerHTML = 'Turn On Map';
	}
}

/**
 * Create Inputs with Labels
 */

function createInput(name, type) {
	let tag = 'input';
	let label = document.createElement('label');
	let input;
	if (type === 'textarea') {
		input = document.createElement(type);
	} else if (type === 'select') {
		input = document.createElement(type);
		for (let i = 5; i > 0; i--) {
			let opt = document.createElement('option');
			opt.innerHTML = `${i} Star`;
			opt.value = i;
			input.appendChild(opt);
		}
	} else {
		input = document.createElement(tag);
		input.setAttribute('type', type);
	}
	label.innerHTML = name.toUpperCase() + ':';
	input.id = name;
	input.setAttribute('name', name);
	label.appendChild(input);
	return label;
}

/**
 * Create a review form
 */
function createReviewForm(e) {
	// Make Overlay for the reivew
	let reviewOverlay = document.createElement('div');
	reviewOverlay.id = 'review-overlay';

	// Create the container for the form
	let reviewForContainer = document.createElement('div');
	reviewForContainer.id = 'add-review-container';
	reviewOverlay.appendChild(reviewForContainer);

	// Create Review Title
	let reviewTitle = document.createElement('h3');
	reviewTitle.innerText = 'Add Review';
	reviewForContainer.appendChild(reviewTitle);

	// Build the form
	let reviewForm = document.createElement('form');
	reviewForm.addEventListener('onsubmit', e => {
		e.preventDefault();
	});
	reviewForContainer.appendChild(reviewForm);

	// Create the inputs
	let reviewName = createInput('name', 'text');
	reviewForm.appendChild(reviewName);

	let reviewRating = createInput('rating', 'select');
	reviewForm.appendChild(reviewRating);

	let reviewComments = createInput('comments', 'textarea');
	reviewForm.appendChild(reviewComments);

	let reviewThankYou = document.createElement('p');
	reviewThankYou.style.display = 'none';
	reviewThankYou.innerHTML = 'Review submitted, thank you!';
	reviewThankYou.id = 'review-thank-you';
	reviewForm.appendChild(reviewThankYou);

	let reviewSubmitButton = document.createElement('button');
	reviewSubmitButton.setAttribute('type', 'submit');
	reviewSubmitButton.id = 'review-submit';
	reviewSubmitButton.innerHTML = 'Submit';

	// Handle Form submit
	reviewSubmitButton.addEventListener('click', e => {
		// prevent form submit so we can do it with a Fetch Post
		e.preventDefault();
		// sample post URL http://localhost:1337/reviews
		let restaurant_id = document
			.getElementById('add-review')
			.getAttribute('data-restaurant-id');
		let name = document.getElementById('name').value;
		let rating = document.getElementById('rating').value;
		let comments = document.getElementById('comments').value;
		let url =
			DBHelper.DATABASE_URL +
			`/reviews/?restaurant_id=${restaurant_id}&name=${name}&rating=${rating}&comments=${comments}`;
		let data = {
			method: 'POST'
		};
		fetch(url, data)
			.then(submitResponse => {
				console.log(submitResponse);
				if (submitResponse.ok) {
					reviewName.style.display = 'none';
					reviewRating.style.display = 'none';
					reviewComments.style.display = 'none';
					reviewSubmitButton.style.display = 'none';
					reviewThankYou.style.display = 'block';
				}
			})
			.then(function() {
				console.log('Review Created');
				document.getElementById('reviews-list').innerHTML = '';
				let cont = document.getElementById('reviews-container');
				let title = document.getElementById('reviews-title');
				cont.removeChild(title);
				getReviews();
			})
			.catch(function(err) {
				console.log('Review was not created');
			});
		// Update the page
	});

	reviewForm.appendChild(reviewSubmitButton);

	// Close review form. Not very effecient
	let closeReviewButton = document.createElement('button');
	closeReviewButton.id = 'cancel-review';
	closeReviewButton.innerHTML = 'Close';

	closeReviewButton.addEventListener('click', e => {
		let containerToRemove = document.getElementById('review-overlay');
		containerToRemove.parentNode.removeChild(containerToRemove);
	});

	reviewForm.appendChild(closeReviewButton);

	// Get the page container
	let mainContent = document.getElementById('maincontent');

	mainContent.appendChild(reviewOverlay);

	document.getElementById('name').focus();
}

/**
 * Get the google maps API stored in a promise
 *
 */

if (useGoogleMaps) {
	loadGoogleMapsApi({ key: 'AIzaSyDEHTLqQlbIc4-odc2DnMiEF2uF3arBz4s' }).then(
		() => {
			return window.initMap();
		}
	);
} else {
	initNoMap();
}

/**
 * Listen for Google Maps Toggle
 */
toggleMapButton.addEventListener('click', toggleGoogleMaps);

/**
 * Listen for Review
 */
document
	.getElementById('add-review')
	.addEventListener('click', createReviewForm);

// Listen for online events
window.addEventListener('online', DBHelper.sendUnsentReviews);
window.addEventListener('offline', function() {
	console.log('Offline');
});
