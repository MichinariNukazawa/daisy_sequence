'use strict';

module.exports = class Version{
	static get_name()
	{
		return 'daisy diagram';
	}

	static get_version()
	{
		const v = {
			"version": "201811.17.0",
		};
		return v.version;
	}
}

