const packager = require('electron-packager');
const config = require('./package.json');
const default_config = require('./build_default.js');

let platform_config = {
	platform: 'win32',
	arch: 'x64',

	icon: './image/icon.ico',
};

let package_config = Object.assign(platform_config, default_config);
// console.log(package_config);

packager(
		package_config,
		function done (err, appPath) {
			if(err) {
				throw new Error(err);
			}
			console.log('Done!!');
		}
	);
