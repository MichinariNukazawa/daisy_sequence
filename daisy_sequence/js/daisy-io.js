'use strict';

const fs = require("fs");
const sprintf = require('sprintf-js').sprintf;
const xml_formatter = require('xml-formatter');

const Version = require('./version');
const Element = require('./element');
const Diagram = require('./diagram');
const RenderingHandle = require('./renderer').RenderingHandle;
const Renderer = require('./renderer').Renderer;

module.exports = class DaisyIO{
	static set_err_(err_, level, label, message)
	{
		err_.level = level;
		err_.label = label;
		err_.message = message;
	}

	static add_errs_(errs_, level, label, message)
	{
		let err_ = {};
		DaisyIO.set_err_(err_, level, label, message);

		if(! Array.isArray(errs_)){
			console.error(errs_);
			errs_ = [];
		}
		errs_.push(err_);
	}

	static open_diagram_from_path(filepath, err_)
	{
		let strdata = '';
		try{
			strdata = fs.readFileSync(filepath, 'utf-8');
		}catch(err){
			console.error(err.message);
			DaisyIO.set_err_(err_, 'warning', "Open", err.message);
			return null;
		}

		const diagram = Diagram.create_from_native_format_string(strdata, err_);
		return diagram;
	}

	static open_doc_from_path(filepath, err_)
	{
		const diagram = DaisyIO.open_diagram_from_path(filepath, err_);
		if(null === diagram){
			return -1;
		}

		let doc = Doc.create_from_diagram(diagram);
		if(null === doc){
			return -1;
		}

		const doc_id = doc_collection.append_doc(doc);
		if(-1 === doc_id){
			DaisyIO.set_err_('warning', "Open", err_.message);
			return -1;
		}

		daisy.append_doc_id(doc_id);

		Doc.set_filepath(doc, filepath);
		Doc.on_save(doc);

		return doc_id;
	}

	static get_dummy_draw_from_diagram_(diagram, opt, err_)
	{
		let dummy_elem = document.createElementNS('http://www.w3.org/2000/svg','svg');
		let dummy_rhandle = new RenderingHandle(dummy_elem);
		let draw = dummy_rhandle.get_draw();
		if(null === draw){
			DaisyIO.set_err_(err_, "warning", "Export", "internal dummy element can not generate.");
			return null;
		}

		Renderer.rendering_(dummy_rhandle, diagram);

		dummy_rhandle.get_focus_group().remove();

		if(opt.hasOwnProperty('background_color')){
			dummy_rhandle.get_background_group().rect('100%','100%')
					.attr({
						'fill':		opt.background_color,
					});
		}

		dummy_rhandle.get_draw().size(diagram.width * opt.scale, diagram.height * opt.scale);
		dummy_rhandle.get_root_group().scale(opt.scale, opt.scale);

		return draw;
	}

	static get_svg_string_from_diagram_(diagram, opt, err_)
	{
		let draw = DaisyIO.get_dummy_draw_from_diagram_(diagram, opt, err_);
		if(null === draw){
			return null;
		}

		let s = draw.svg();

		const h = sprintf("<!-- Generator: %s %s  -->", Version.get_name(), Version.get_version());
		s = h + s;

		let options = {indentation: '\t',};
		return xml_formatter(s, options);
	}

	static get_ext_from_filepath(filepath)
	{
		return filepath.match(/\.[a-zA-Z0-9]*$/)[0];
	}

	static write_export_diagram(filepath, diagram, errs_)
	{
		const ext = DaisyIO.get_ext_from_filepath(filepath);

		let res;
		switch(ext){
			case '.png':
				res = DaisyIO.write_export_png_from_diagram_(filepath, diagram, errs_);
				break;
			case '.svg':
				res = DaisyIO.write_export_svg_from_diagram_(filepath, diagram, errs_);
				break;
			case '.puml':
				res = DaisyIO.write_export_plantuml_from_diagram_(filepath, diagram, errs_);
				break;
			default:
				DaisyIO.add_errs_(errs_, "warning", "Export", sprintf("invalid file type. :`%s`", filepath));
				return false;
		}

		return res;
	}

	static write_export_png_from_diagram_(filepath, diagram, errs_)
	{
		let err_ = {};
		const opt = {
			'scale': 4,
			'background_color': "#fff",
		};
		const strdata = DaisyIO.get_svg_string_from_diagram_(diagram, opt, err_);
		if(null === strdata){
			console.error(err_);
			DaisyIO.add_errs_(errs_, err_.level, "Export", err_.message);
			return false;
		}

		const svg2png = require("svg2png");
		const output = svg2png.sync(strdata, {});

		try{
			fs.writeFileSync(filepath, output);
		}catch(err){
			DaisyIO.add_errs_(errs_, "warning", "Export", sprintf("writeFile error. :`%s`", filepath));
			return false;
		}

		return true;
	}

	static write_export_svg_from_diagram_(filepath, diagram, errs_)
	{
		let err_ = {};
		const opt = {
			'scale': 1,
		};
		const strdata = DaisyIO.get_svg_string_from_diagram_(diagram, opt, err_);
		if(null === strdata){
			console.error(err_);
			DaisyIO.add_errs_(errs_, err_.level, "Export", err_.message);
			return false;
		}

		try{
			fs.writeFileSync(filepath, strdata);
		}catch(err){
			DaisyIO.add_errs_(errs_, "warning", "Export", sprintf("writeFile error. :`%s`", filepath));
			return false;
		}

		return true;
	}

	static write_export_plantuml_from_diagram_(filepath, diagram, errs_)
	{
		const strdata = Diagram.get_plantuml_string(diagram, errs_);
		if(null === strdata){
			console.debug(errs_);
			return false;
		}

		try{
			fs.writeFileSync(filepath, strdata);
		}catch(err){
			DaisyIO.add_errs_(errs_, "warning", "Export", sprintf("writeFile error. :`%s`", filepath));
			return false;
		}

		return true;
	}
};

