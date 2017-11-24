self.addEventListener('install', function(event){
    // caching all static files
    event.waitUntil(
        caches.open('static').then(function(cache){
            return cache.addAll([
                // index
                '/',
                '/index.html',
                '/favicon.ico',
                // static
                '/static/app.js',
                '/static/app.css',
                '/static/bg.jpg',
                // lib
                '/static/lib/axios.min.js',
                '/static/lib/bootstrap.min.css',
                '/static/lib/bootstrap.min.js',
                '/static/lib/jquery.min.js',
                '/static/lib/js.cookie.min.js',
                '/static/lib/moment.min.js',
                '/static/lib/vue.min.js',
                '/static/lib/navigo.min.js',
                // fonts
                '/static/fonts/glyphicons-halflings-regular.ttf',
                '/static/fonts/glyphicons-halflings-regular.woff',
                '/static/fonts/glyphicons-halflings-regular.woff2',
                'https://fonts.googleapis.com/css?family=Roboto Condensed'
            ]);
        })
    );
});

self.addEventListener('fetch', function(event){
    event.respondWith(
        caches.match(event.request).then(function(response){
            return response || fetch(event.request);
        })
    );    
});