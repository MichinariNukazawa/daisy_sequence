'use strict';

module.exports = class Cli{
	/**
	 @detauls
	 - electron,node実行の際、渡す前に`electron`,`node`を除去しておくこと。
	 @return 成功はarg.err === null にて返す。失敗時はarg.err = {'message': string};を格納する。
	*/
	static parse(argv)
	{
		const sprintf = require('sprintf-js').sprintf;

		let arg = {
			'open_filepath':	null,
			'export_filepath':	null,
			'is_cli_mode':		false,
			'err':			null,
		};

		if(typeof argv[1] === 'string'){
			arg.open_filepath = argv[1];
		}

		if(2 < argv.length){
			if(argv[2] !== '-o'){
				arg.err = {
					'message': spirntf('invalid argment. `%s`', argv[2])
					//'message': spirntf('invalid argment. `%s`', argv[2])
				};
				return arg;
			}

			if(typeof argv[3] !== 'string'){
				arg.err = {
					'message': 'option -o after string not exits.'
				};
				return arg;
			}

			arg.export_filepath = argv[3];
			arg.is_cli_mode = true;
		}

		return arg;
	}
};

