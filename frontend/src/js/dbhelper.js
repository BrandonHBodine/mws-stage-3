'use strict';
const loadGoogleMapsApi = require('load-google-maps-api');

/**
 * Common database helper functions.
 */
export class DBHelper {
	/**
	 * Database URL.
	 * Change this to restaurants.json file location on your server.
	 */
	static get DATABASE_URL() {
		const port = 1337; // Change this to your server port
		return `http://localhost:${port}`;
	}
	/**
	 * Fetch all restaurants.
	 */
	static fetchRestaurants(callback) {
		let xhr = new XMLHttpRequest();
		xhr.open('GET', DBHelper.DATABASE_URL + '/restaurants');
		xhr.onload = () => {
			if (xhr.status === 200) {
				// Got a success response from server!
				console.log(xhr);
				const json = JSON.parse(xhr.responseText);
				const restaurants = json;
				callback(null, restaurants);
			} else {
				// Oops!. Got an error from server.
				const error = `Request failed. Returned status of ${xhr.status}`;
				callback(error, null);
			}
		};
		xhr.send();
	}

	/**
	 * Fetch a restaurant by its ID.
	 */
	static fetchRestaurantById(id, callback) {
		// fetch all restaurants with proper error handling.
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				const restaurant = restaurants.find(r => r.id == id);
				if (restaurant) {
					// Got the restaurant
					callback(null, restaurant);
				} else {
					// Restaurant does not exist in the database
					callback('Restaurant does not exist', null);
				}
			}
		});
	}

	/**
	 * Fetch restaurants by a cuisine type with proper error handling.
	 */
	static fetchRestaurantByCuisine(cuisine, callback) {
		// Fetch all restaurants  with proper error handling
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Filter restaurants to have only given cuisine type
				const results = restaurants.filter(r => r.cuisine_type == cuisine);
				callback(null, results);
			}
		});
	}

	/**
	 * Fetch restaurants by a neighborhood with proper error handling.
	 */
	static fetchRestaurantByNeighborhood(neighborhood, callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Filter restaurants to have only given neighborhood
				const results = restaurants.filter(r => r.neighborhood == neighborhood);
				callback(null, results);
			}
		});
	}

	/**
	 * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
	 */
	static fetchRestaurantByCuisineAndNeighborhood(
		cuisine,
		neighborhood,
		callback
	) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				let results = restaurants;
				if (cuisine != 'all') {
					// filter by cuisine
					results = results.filter(r => r.cuisine_type == cuisine);
				}
				if (neighborhood != 'all') {
					// filter by neighborhood
					results = results.filter(r => r.neighborhood == neighborhood);
				}
				callback(null, results);
			}
		});
	}

	/**
	 * Fetch all neighborhoods with proper error handling.
	 */
	static fetchNeighborhoods(callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Get all neighborhoods from all restaurants
				const neighborhoods = restaurants.map(
					(v, i) => restaurants[i].neighborhood
				);
				// Remove duplicates from neighborhoods
				const uniqueNeighborhoods = neighborhoods.filter(
					(v, i) => neighborhoods.indexOf(v) == i
				);
				callback(null, uniqueNeighborhoods);
			}
		});
	}

	/**
	 * Fetch all cuisines with proper error handling.
	 */
	static fetchCuisines(callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Get all cuisines from all restaurants
				const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
				// Remove duplicates from cuisines
				const uniqueCuisines = cuisines.filter(
					(v, i) => cuisines.indexOf(v) == i
				);
				callback(null, uniqueCuisines);
			}
		});
	}

	/**
	 * Restaurant page URL.
	 */
	static urlForRestaurant(restaurant) {
		return `./restaurant.html?id=${restaurant.id}`;
	}

	/**
	 * Restaurant image URL.
	 */
	static imageUrlForRestaurant(restaurant) {
		if (restaurant.photograph) {
			return `/img/${restaurant.photograph}.jpg`;
		} else {
			return `/img/${restaurant.id}.jpg`;
		}
	}

	/**
	 * Map marker for a restaurant.
	 */
	static mapMarkerForRestaurant(restaurant, map, useGoogleMaps) {
		if (useGoogleMaps) {
			const marker = new google.maps.Marker({
				position: restaurant.latlng,
				title: restaurant.name,
				url: DBHelper.urlForRestaurant(restaurant),
				map: map,
				animation: google.maps.Animation.DROP
			});
			return marker;
		}
	}

	/**
	 * Toggle Favorite for restaurant on server
	 * Returning a promise with server response
	 */
	static toggleRestaurantFavorite(restaurant_id, favorite_status) {
		let data = {
			method: 'PUT'
		};
		let favorite_boolean = favorite_status === 'true' ? true : false;
		let url = `${
			DBHelper.DATABASE_URL
		}/restaurants/${restaurant_id}/?is_favorite=${(!favorite_boolean).toString()}`;
		return fetch(url, data)
			.then(() => {
				return !favorite_boolean;
			})
			.catch(err => {
				console.log('Error in favorite toggle', err);
			});
	}

	/**
	 * Create a review form
	 */
	static createReviewForm(e) {
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
		let reviewName = DBHelper.createInput('name', 'text');
		reviewForm.appendChild(reviewName);

		let reviewRating = DBHelper.createInput('rating', 'select');
		reviewForm.appendChild(reviewRating);

		let reviewComments = DBHelper.createInput('comments', 'textarea');
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
			fetch(url, data).then(submitResponse => {
				console.log('DPHELPER', submitResponse);
				if (submitResponse.ok) {
					reviewName.style.display = 'none';
					reviewRating.style.display = 'none';
					reviewComments.style.display = 'none';
					reviewSubmitButton.style.display = 'none';
					reviewThankYou.style.display = 'block';
				}
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
	 * Create Inputs with Labels
	 */

	static createInput(name, type) {
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

	static sendUnsentReviews() {
		let url = DBHelper.DATABASE_URL + '/unsent';
		let data = {
			method: 'POST'
		};
		console.log('Attempting to post to unsent');
		fetch(url, data)
			.then(submitResponse => {
				console.log('Unsent Reviews');
				return submitResponse;
			})
			.catch(function(err) {
				console.log(err);
			});
	}
}
