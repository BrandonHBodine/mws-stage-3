import { DBHelper } from './dbhelper';
import TryServiceWorker from './all';
const loadGoogleMapsApi = require('load-google-maps-api');

let useGoogleMaps = false;
let toggleMapButton = document.getElementById('toggleMap');
let restaurants;
let neighborhoods;
let cuisines;
let map;
let markers = [];

/**
 * Check for Service Worker in browser
 */

TryServiceWorker();

/**
 * Fetch all neighborhoods and set their HTML.
 */
function fetchNeighborhoods() {
	DBHelper.fetchNeighborhoods((error, neighborhoods) => {
		if (error) {
			// Got an error
			console.error(error);
		} else {
			self.neighborhoods = neighborhoods;
			fillNeighborhoodsHTML();
		}
	});
}

/**
 * Set neighborhoods HTML.
 */
function fillNeighborhoodsHTML(neighborhoods = self.neighborhoods) {
	const select = document.getElementById('neighborhoods-select');
	neighborhoods.forEach(neighborhood => {
		const option = document.createElement('option');
		option.innerHTML = neighborhood;
		option.value = neighborhood;
		select.append(option);
	});
}

/**
 * Fetch all cuisines and set their HTML.
 */
function fetchCuisines() {
	DBHelper.fetchCuisines((error, cuisines) => {
		if (error) {
			// Got an error!
			console.error(error);
		} else {
			self.cuisines = cuisines;
			fillCuisinesHTML();
		}
	});
}

/**
 * Set cuisines HTML.
 */
function fillCuisinesHTML(cuisines = self.cuisines) {
	const select = document.getElementById('cuisines-select');

	cuisines.forEach(cuisine => {
		const option = document.createElement('option');
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
	let loc = {
		lat: 40.722216,
		lng: -73.987501
	};
	self.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 12,
		center: loc,
		scrollwheel: false
	});
};

/**
 * Update page and map for current restaurants.
 */
function updateRestaurants() {
	const cSelect = document.getElementById('cuisines-select');
	const nSelect = document.getElementById('neighborhoods-select');

	const cIndex = cSelect.selectedIndex;
	const nIndex = nSelect.selectedIndex;

	const cuisine = cSelect[cIndex].value;
	const neighborhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndNeighborhood(
		cuisine,
		neighborhood,
		(error, restaurants) => {
			if (error) {
				// Got an error!
				console.error(error);
			} else {
				resetRestaurants(restaurants);
				fillRestaurantsHTML();
			}
		}
	);
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
function resetRestaurants(restaurants) {
	// Remove all restaurants
	self.restaurants = [];
	const ul = document.getElementById('restaurants-list');
	ul.innerHTML = '';

	// Remove all map markers
	if (self.markers && self.markers.length > 0) {
		self.markers.forEach(m => m.setMap(null));
	}

	self.markers = [];
	self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */

function fillRestaurantsHTML(restaurants = self.restaurants) {
	const ul = document.getElementById('restaurants-list');
	restaurants.forEach(restaurant => {
		ul.append(createRestaurantHTML(restaurant));
	});
	addMarkersToMap();
}

function toggleFavoriteButton(e) {
	let restuarantID = e.target.getAttribute('data-restaurant-id');
	let favoriteStatus = e.target.getAttribute('data-restaurant-favorite');
	DBHelper.toggleRestaurantFavorite(restuarantID, favoriteStatus).then(res => {
		e.target.setAttribute('data-restaurant-favorite', res.toString());
		if (res) {
			e.target.classList.add('is-favorite');
			e.target.classList.remove('add-favorite');
			e.target.innerHTML = 'Is Favorite';
		} else {
			e.target.classList.add('add-favorite');
			e.target.classList.remove('is-favorite');
			e.target.innerHTML = 'Add Favorite';
		}
	});
}

/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant) {
	const li = document.createElement('li');

	const image = document.createElement('img');
	image.className = 'restaurant-img';
	image.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.setAttribute('alt', restaurant.name);
	li.append(image);

	const section = document.createElement('section');
	li.append(section);

	const name = document.createElement('h1');
	name.innerHTML = restaurant.name;
	section.append(name);

	const neighborhood = document.createElement('p');
	neighborhood.innerHTML = restaurant.neighborhood;
	section.append(neighborhood);

	const address = document.createElement('p');
	address.innerHTML = restaurant.address;
	section.append(address);

	const favoriteButton = document.createElement('button');
	favoriteButton.setAttribute('data-restaurant-id', restaurant.id);
	favoriteButton.setAttribute(
		'data-restaurant-favorite',
		restaurant.is_favorite
	);

	if (restaurant.is_favorite.toString() === 'true') {
		favoriteButton.classList.add('is-favorite');
		favoriteButton.classList.remove('add-favorite');
		favoriteButton.innerHTML = 'Is Favorite';
	} else {
		favoriteButton.classList.add('add-favorite');
		favoriteButton.classList.remove('is-favorite');
		favoriteButton.innerHTML = 'Add Favorite';
	}

	favoriteButton.addEventListener('click', toggleFavoriteButton);
	section.append(favoriteButton);

	const more = document.createElement('a');
	const button = document.createElement('button');
	button.innerHTML = 'View Details';
	button.setAttribute('tabindex', '-1');
	more.href = DBHelper.urlForRestaurant(restaurant);
	more.append(button);
	section.append(more);

	return li;
}

/**
 * Add markers for current restaurants to the map.
 */
function addMarkersToMap(restaurants = self.restaurants) {
	if (useGoogleMaps) {
		restaurants.forEach(restaurant => {
			// Add marker to the map
			const marker = DBHelper.mapMarkerForRestaurant(
				restaurant,
				self.map,
				useGoogleMaps
			);
			google.maps.event.addListener(marker, 'click', () => {
				window.location.href = marker.url;
			});
			self.markers.push(marker);
		});
	}
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
				updateRestaurants();
			}
		);
	} else {
		document.getElementById('map').style.display = 'none';
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
			window.initMap();
			updateRestaurants();
		}
	);
} else {
	document.getElementById('map').style.display = 'none';
	updateRestaurants();
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
	fetchNeighborhoods();
	fetchCuisines();

	// Attach event listners
	document
		.getElementById('cuisines-select')
		.addEventListener('change', updateRestaurants);
	document
		.getElementById('neighborhoods-select')
		.addEventListener('change', updateRestaurants);
});

/**
 * Listen for Google Maps Toggle
 */
toggleMapButton.addEventListener('click', toggleGoogleMaps);

// Listen for online events
window.addEventListener('online', DBHelper.sendUnsentReviews);
window.addEventListener('offline', function() {
	console.log('Offline');
});
