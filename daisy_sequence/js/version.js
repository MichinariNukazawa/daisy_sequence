'use strict';

module.exports = class Version{
	static get_name()
	{
		return 'daisy diagram';
	}

	static get_version()
	{
		const v = {
			"version": "201804.07.0",
		};
		return v.version;
	}
}

