#!/usr/bin/env node
'use strict';

const sprintf = require('sprintf-js').sprintf;


const window   = require('svgdom')
const SVG      = require('svg.js')(window)
const document = window.document

var jsdom = require('jsdom');
// Create a fake DOM for testing with $.ajax
global.window = new jsdom.JSDOM().window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;


const DaisyIO = require('../index').DaisyIO;

function process_argument(argv)
{
	// コマンドライン引数を[1]からに調整(node実行の場合に必要)
	if(argv[0].endsWith('node')){
		argv.shift();
	}

	const Cli = require('../js/cli');
	let arg = Cli.parse(argv);

	return arg;
}

function main()
{
	let argv = process.argv;
	const arg = process_argument(argv);

	if(null != arg.err){
		process.stderr.write(sprintf("%s\n", arg.message));
		process.exit(-1);
	}

	let err = {};
	let diagram = DaisyIO.open_diagram_from_path(arg.open_filepath, err);
	if(! diagram){
		process.stderr.write(sprintf("can not open file `%s``%s`.\n", err.message, arg.open_filepath));
		process.exit(-1);
	}

	let errs = [];
	if(! DaisyIO.write_export_diagram(arg.export_filepath, diagram, errs)){
		process.stderr.write(sprintf("can not export file `%s``%s`.\n", err.message, arg.export_filepath));
		process.exit(-1);
	}
	for(let i = 0; i < errs.length; i++){
		process.stderr.write(sprintf("export warning[%2d/%2d]:%8s:%s\n", i, errs.length, errs[i].level, errs[i].message));
	}
}

main();

