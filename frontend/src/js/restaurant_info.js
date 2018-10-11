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
	fetch(DBHelper.DATABASE_URL + `/reviews/?restaurant_id=${restaurant.id}`)
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
	date.innerHTML = new Date(review.createdAt).toLocaleDateString();
	li.appendChild(date);

	// Maybe add a updated at field

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
	.addEventListener('click', DBHelper.createReviewForm);
	
window.addEventListener('online', DBHelper.sendUnsentReviews);
window.addEventListener('offline', function() {
	console.log('Offline');
});
