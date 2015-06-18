
/* Start Config */
// Display message in console to users to set up config
console.warn("****************************\n" +
             'Make sure to set up your config file for your project type and other options or gulp will not work properly!' +
             '\n****************************');
var config = require('./package.json');
var main_conf = config.main_config;

var isShopify = false;
// Check if shopify to see if we run gulp-config-upload
if(main_conf.type == 'shopify') {
	isShopify = true;
}

/* End Config */
// Get the home directory of the user
var pwuid = require('pwuid');
var userDir = pwuid().dir;

// Gulp plugin setup
var gulp = require('gulp');
var del = require('del');
var symlink = require('gulp-symlink');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var map = require('map-stream');
var events = require('events');
var watchFile = require('gulp-watch');
var gulpShopify = require('gulp-shopify-upload');

// For conditional task running
var gulpif = require('gulp-if');

// js libs
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('hintjs', function(){
	return gulp.src([main_conf.js_loc])
		.pipe(plumber())
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		.pipe(map(function(file, cb) {
			if (!file.jshint.success) {
				file.jshint.results.forEach(function (err) {
					if (err) {
						var file = err.file.split('/').pop(),
							message = err.error.reason;

						// Make sure to emit an event when this fails
						// so that notify can pick up on it.
						var emitter = new events.EventEmitter();
						emitter.emit('error', new Error(file + ':' + err.error.line + ' | ' + message));
					}
				});
			}

			cb(null, file);
		}))
		.on('error', notify.onError({
			title: 'JS Compiler',
			message: function(error) {
				return error.toString().replace('Error: ', '');
			}
		}))
		.pipe(gulpif(main_conf.notifications, notify({title: 'JS Compiler', message: main_conf.js_name + ' written'})));
});

// Minify the JS and check for errors
gulp.task('uglifyjs', ['hintjs'], function(){
	gulp.src([main_conf.js_loc])
		.pipe(plumber())
		.pipe(concat(main_conf.js_name))
		.pipe(uglify())
		.pipe(gulp.dest(main_conf.js_dest));
});

gulp.task('watchjs', function() {
	gulp.watch([main_conf.js_loc], ['hintjs', 'uglifyjs']);
});

// less libs
var less = require('gulp-less');
var lessPluginCleanCSS = require("less-plugin-clean-css"),
	cleancss = new lessPluginCleanCSS({advanced: true});

var lessPluginAutoPrefix = require('less-plugin-autoprefix'),
	autoprefix = new lessPluginAutoPrefix({browsers: ['last ' + main_conf.browser_versions_covered + ' versions',
	                                      			  'Explorer >= 8']});

// This task compiles the less file by auto prefixing, cleaning the css, and
// concating it
gulp.task('compileless', function() {
	return gulp.src(main_conf.less_loc)
		.pipe(plumber())
		.pipe(less({
				plugins: [autoprefix, cleancss]
			}))
		.on('error', notify.onError({
			title: 'LESS Compiler',
			message: function(error) {
				console.log(error);
				var message = error.message.split('in file')[0],
					file = error.fileName.split('/').pop();

				return file + ':' + error.lineNumber + ' | ' + message;
			}
		}))
		.pipe(concat(main_conf.css_name))
		.pipe(gulp.dest(main_conf.css_dest))
		.pipe(gulpif(main_conf.notifications, notify({title: 'LESS Compiler', message: main_conf.css_name + ' written'})));
});

gulp.task('watchless', function() {
	gulp.watch(main_conf.less_loc, ['compileless']);
});

// Browser sync handles auto refresh when modifying css, js, html, pictures, and
// more!
gulp.task('browser-sync', function () {
	// Read in the list of file patterns to watch from the config file
	var files = main_conf.browser_sync_files,
		browserSyncConfig = {
			open: false, //don't open a browser window automatically
			// browser: ['google chrome', 'firefox'] //open in browsers upon starting browsersync
			files: files,
			proxy: main_conf.domain, //proxies the vhost to localhost:3000
			port: 3001
		};

	// If it is a shopify project, add a reload delay
	if(isShopify) {
		browserSyncConfig.reloadDelay = 2000;
	}

	browserSync(browserSyncConfig);
});

// Mixin tasks below to symlink mixins to proper user
// This clears the mixins
gulp.task('clean-mixins', function (cb) {
 	del([
	    main_conf.mixin_loc + 'mixins-2014.less',
	    main_conf.mixin_loc + 'normalize.less',
    ], cb);
});
gulp.task('symlink-mixins-2014', ['clean-mixins'], function () {
	return gulp.src(userDir + '/BitBucket/less-utilities/mixins-2014.less')
    	.pipe(plumber())
    	.pipe(symlink(main_conf.mixin_loc + 'mixins-2014.less'));
});
gulp.task('symlink-normalize', ['clean-mixins'], function () {
	return gulp.src(userDir + '/BitBucket/less-utilities/normalize.less')
    	.pipe(plumber())
    	.pipe(symlink(main_conf.mixin_loc + 'normalize.less'));
});

// For Shopify uploading
gulp.task('shopifywatch', function() {
	// Only run the task contents if this is a shopify project
	if(isShopify) {
		return watchFile('./+(assets|layout|config|snippets|templates|locales)/**')
		.pipe(gulpShopify(main_conf.api_key, main_conf.password, main_conf.url)); // Optional theme ID can be specified as last argument
	}
});


// Default gulp action when gulp is run
// We want to watch the js and less, and keep everything in sync with browser
gulp.task('default', [
        'clean-mixins',
        'symlink-mixins-2014',
        'symlink-normalize',
		'watchjs',
		'watchless',
		'browser-sync',
		'shopifywatch'
]);