import '../css/styles.css';

/***
 * Register Service worker if avaliable in browser
 **/

export default function TryServiceWorker() {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function() {
			navigator.serviceWorker.register('/sw.js').then(
				function(registration) {
					console.log(
						'Service Worker file registration successful!',
						registration
					);
				},
				function(err) {
					console.log('Service Worker failed: ', err);
				}
			);
		});
	}
}
