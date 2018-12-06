#!/usr/bin/env node
'use strict';

const sprintf = require('sprintf-js').sprintf;


const window   = require('svgdom')
const SVG      = require('svg.js')(window)
const document = window.document

global.document = document;

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

	let errs_ = [];

	let diagram = DaisyIO.open_diagram_from_path(arg.open_filepath, errs_);
	for(let i = 0; i < errs_.length; i++){
		process.stderr.write(sprintf("export[%2d/%2d]%8s:%s\n", i, errs_.length, errs_[i].level, errs_[i].message));
	}
	if(! diagram){
		process.stderr.write(sprintf("error: can not open file `%s`.\n", arg.open_filepath));
		process.exit(-1);
	}

	const res = DaisyIO.write_export_diagram(arg.export_filepath, diagram, errs_);
	for(let i = 0; i < errs_.length; i++){
		process.stderr.write(sprintf("export[%2d/%2d]%8s:%s\n", i, errs_.length, errs_[i].level, errs_[i].message));
	}
	if(! res){
		process.stderr.write(sprintf("error: can not export file `%s`.\n", arg.export_filepath));
		process.exit(-1);
	}
}

main();

