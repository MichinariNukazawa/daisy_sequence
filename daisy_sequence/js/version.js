'use strict';

module.exports = class Version{
	static get_name()
	{
		const Package = require('../package.json');
		return Package.name;
	}

	static get_version()
	{
		const Package = require('../package.json');
		const v = {
			"version": Package.version,
		};
		return v.version;
	}
}

