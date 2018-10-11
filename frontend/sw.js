import idb from 'idb';

const staticCacheName = 'restaurant-reviews-v1';
const contentImgsCache = 'restaurant-images-v1';
const mapCache = 'restaurant-map-v1';
const allCaches = [staticCacheName, contentImgsCache, mapCache];
const filesArr = [
	'/index.html',
	'/restaurant.html',
	'/restaurant.bundle.js',
	'/main.bundle.js'
];

var dbPromise = idb.open('restaurant-reviews', 1, function(upgradeDB) {
	upgradeDB.createObjectStore('restaurants');
	upgradeDB.createObjectStore('reviews');
	upgradeDB.createObjectStore('unsent-reviews');
});

const idbRestaurants = {
	get(key) {
		return dbPromise.then(db => {
			return db
				.transaction('restaurants')
				.objectStore('restaurants')
				.get(key);
		});
	},
	set(key, val) {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants', 'readwrite');
			tx.objectStore('restaurants').put(val, key);
			return tx.complete;
		});
	},
	delete(key) {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants', 'readwrite');
			tx.objectStore('restaurants').delete(key);
			return tx.complete;
		});
	},
	clear() {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants', 'readwrite');
			tx.objectStore('restaurants').clear();
			return tx.complete;
		});
	},
	keys() {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants');
			const keys = [];
			const store = tx.objectStore('restaurants');

			// This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
			// openKeyCursor isn't supported by Safari, so we fall back
			(store.iterateKeyCursor || store.iterateCursor).call(store, cursor => {
				if (!cursor) return;
				keys.push(cursor.key);
				cursor.continue();
			});

			return tx.complete.then(() => keys);
		});
	},

	getReviews(key) {
		return dbPromise.then(db => {
			return db
				.transaction('reviews')
				.objectStore('reviews')
				.get(key);
		});
	},

	setReviews(key, val) {
		return dbPromise.then(db => {
			const tx = db.transaction('reviews', 'readwrite');
			tx.objectStore('reviews').put(val, key);
			return tx.complete;
		});
	},

	setUnsentReview(key, val) {
		return dbPromise.then(db => {
			const tx = db.transaction('unsent-reviews', 'readwrite');
			tx.objectStore('unsent-reviews').put(val, key);
			return tx.complete;
		});
	},
	getUnsentReviews() {
		return dbPromise.then(db => {
			return db
				.transaction('unsent-reviews', 'readwrite')
				.objectStore('unsent-reviews')
				.getAll();
		});
	},
	deleteUnsentReview(key) {
		return dbPromise.then(db => {
			const tx = db.transaction('unsent-reviews', 'readwrite');
			tx.objectStore('unsent-reviews').delete(key);
			return tx.complete;
		});
	}
};

self.addEventListener('install', function(event) {
	console.log('ServiceWorker installed');
	event.waitUntil(
		caches
			.open(staticCacheName)
			.then(function(cache) {
				return cache.addAll(filesArr);
			})
			.catch(function(err) {
				console.log('Error has occured: ', err);
			})
	);
});

self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(
				cacheNames
					.filter(function(cacheName) {
						return (
							cacheName.startsWith('restaurant-') &&
							!allCaches.includes(cacheName)
						);
					})
					.map(function(cacheName) {
						return caches.delete(cacheName);
					})
			);
		})
	);
});

self.addEventListener('fetch', function(event) {
	let requestUrl = new URL(event.request.url);
	// Check for requests made to app and are special cases
	if (requestUrl.origin === location.origin) {
		if (requestUrl.pathname === '/') {
			console.log('Serving cached index page');
			event.respondWith(caches.match('/index.html'));
			return;
		}

		if (requestUrl.pathname === '/restaurant.html') {
			// URL params stay intact
			console.log('Serving restraunt page');
			event.respondWith(caches.match('/restaurant.html'));
			return;
		}

		// Check for images to serve
		if (requestUrl.pathname.startsWith('/img/')) {
			console.log('Image requested, checking cache');
			event.respondWith(servePhoto(event.request));
			return;
		}

		// Check for map
		if (requestUrl.pathname.startsWith('/maps/api/js')) {
			console.log('Map requested, checking cache');
			event.respondWith(serveMap(event.request));
			return;
		}
	}

	// Resturants JSON
	if (requestUrl.pathname === '/restaurants') {
		event.respondWith(serveRestaurantsJSON(event.request));
		return;
	}

	// Check for reviews request
	if (requestUrl.pathname.startsWith('/reviews')) {
		// May need to ensure ?restaurant_id= is in the request

		if (event.request.method === 'GET') {
			event.respondWith(getRestaurantReviews(requestUrl));
			return;
		}

		if (event.request.method === 'POST') {
			console.log('review method', event.request.method);
			event.respondWith(postRestaurantReviews(requestUrl, event.request));
			return;
		}

		event.respondWith(fetch(requestUrl));
		return;
	}

	// check for unsent reviews
	if (requestUrl.pathname.startsWith('/unsent')) {
		if (event.request.method === 'POST') {
			return event.respondWith(sendUnsentReviews());
		}
	}

	// Catch all cache external responses
	event.respondWith(
		caches.match(event.request).then(function(response) {
			return response || fetch(event.request);
		})
	);
});

function servePhoto(request) {
	// Update to user friendly name
	const storageUrl = request.url.replace(/-\d+px\.jpg$/, '');

	// Add image to cache and serve image if in cache
	return caches.open(contentImgsCache).then(function(cache) {
		return cache.match(storageUrl).then(function(response) {
			if (response) return response;

			return fetch(request).then(function(networkResponse) {
				cache.put(storageUrl, networkResponse.clone());
				return networkResponse;
			});
		});
	});
}

function serveMap(requestMap) {
	// I wonder what it's response type is?
	const mapName = 'map';

	return caches.open(mapCache).then(function(cache) {
		return cache.match(mapName).then(function(mapResponse) {
			// If there is a map in the cache respond with it
			if (mapResponse) return mapResponse;

			// Get map then cache and serve it
			return fetch(requestMap, { mode: 'no-cors' }).then(function(
				networkResponseMap
			) {
				cache.put(mapName, networkResponseMap.clone());
				return networkResponseMap;
			});
		});
	});
}

function serveRestaurantsJSON(requestJSON) {
	return fetch(requestJSON)
		.then(function(res) {
			if (res.ok) {
				let indexValue = res.clone();
				// Put JSON in indexedDB
				indexValue.json().then(function(json) {
					idbRestaurants.set('restaurants-json', json);
				});
				return res;
			}
		})
		.catch(function(err) {
			// When fetch fails try and serve non cached assests
			return idbRestaurants.get('restaurants-json').then(function(val) {
				if (val) {
					console.log('IndexDB JSON Found');
					return new Response(JSON.stringify(val));
				}
			});
		});
}

function getRestaurantReviews(requestUrl) {
	// This function is for GET requests so we can quickly retrive the meesages
	let restaurantID = getRestaurantID(requestUrl);

	// Try request first then fallback to
	return fetch(requestUrl)
		.then(function(res) {
			console.log(res);
			if (res.ok) {
				let indexValue = res.clone();
				// Put JSON in indexedDB
				return indexValue.json().then(function(json) {
					idbRestaurants.setReviews(restaurantID, json);
					return res;
				});
			}
		})
		.catch(function(err) {
			// Try and get the reviews from IDB
			return idbRestaurants.getReviews(restaurantID).then(function(val) {
				if (val) {
					console.log('IndexDB JSON Found');
					return new Response(JSON.stringify(val));
				}
			});
		});
}

function postRestaurantReviews(requestUrl, postRequest) {
	// This function is for POST requests so we can make sure we can post the message if avaliable
	// ?restaurant_id=6&name=abobknd%20a&rating=5&comments=ldnaklndaknd"
	let restaurantID = getRestaurantID(requestUrl);
	console.log(requestUrl);
	// Get url Params
	let params = requestUrl.searchParams;
	let requestName = params.get('name');
	let requestRating = params.get('rating');
	let requestComments = params.get('comments');
	let requestID = params.get('restaurant_id');
	let requestHref = requestUrl.href;
	let requestHost = requestUrl.host;
	return fetch(requestUrl)
		.then(function(res) {
			console.log('Post made it to server');
			return res;
		})
		.catch(function() {
			// If not store to be uploaded later
			console.log('Saving review to IDB');
			let reviewContents = {
				requestName,
				requestRating,
				requestComments,
				requestID,
				requestHref,
				requestHost
			};
			return idbRestaurants
				.setUnsentReview(requestName, reviewContents)
				.then(function() {
					let init = {
						status: 200,
						statusText: "Couldn't make it to server saving for later"
					};
					let swResponse = new Response({}, init);
					return swResponse;
				});
		});
}

function getRestaurantID(requestUrl) {
	// Get the restaurant id from the url
	let reg = /(\?restaurant_id=)([0-9]+)(.*)/;
	return requestUrl.search.replace(reg, function(match, c1, c2, c3) {
		return c2;
	});
}

function sendUnsentReviews() {
	console.log('Unsent Function sending reviews');
	return idbRestaurants.getUnsentReviews().then(function(reviewsArray) {
		let reviewsPromiseArray = reviewsArray.map(function(curReview) {
			let url = `http://${curReview.requestHost}
				/reviews/?restaurant_id=${curReview.requestID}&name=${
				curReview.requestName
			}&rating=${curReview.requestRating}&comments=${
				curReview.requestComments
			}`;
			let data = {
				method: 'POST'
			};
			// Send requests
			let reviewRequest = new Request(url, data);
			console.log(reviewRequest);
			fetch(reviewRequest).then(function(res) {
				console.log('fetch res', res);
				if (res.ok) {
					return idbRestaurants.deleteUnsentReview(curReview.requestName);
				}
			});
		});

		return Promise.all(reviewsPromiseArray)
			.then(function(values) {
				return new Response(null, { status: 200, statusText: 'Uploading' });
			})
			.catch(function(err) {
				console.log('Failed to upload unsent reviews', err);
				return new Response(null, {
					status: 200,
					statusText: 'Failed to upload'
				});
			});
	});
}
