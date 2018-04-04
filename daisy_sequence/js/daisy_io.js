'use strict';

class DaisyIO{
	static set_err_(err_, level, label, message)
	{
		err_.level = level;
		err_.label = label;
		err_.message = message;
	}

	static open_doc_from_path(filepath, err_)
	{
		let strdata = '';
		try{
			strdata = fs.readFileSync(filepath, 'utf-8');
		}catch(err){
			console.error(err.message);
			DaisyIO.set_err_(err_, 'warning', "Open", err.message);
			return -1;
		}

		const doc_id = doc_collection.create_doc_from_native_format_string(strdata, err_);
		if(-1 === doc_id){
			DaisyIO.set_err_('warning', "Open", err.message);
			return -1;
		}

		daisy.append_doc_id(doc_id);

		let doc = doc_collection.get_doc_from_id(doc_id);
		Doc.set_filepath(doc, filepath);
		Doc.on_save(doc);

		return doc_id;
	}

	static get_dummy_draw_(doc, err_)
	{
		let dummy_elem = document.createElementNS('http://www.w3.org/2000/svg','svg');
		let dummy_rhandle = new RenderingHandle(dummy_elem);
		let draw = dummy_rhandle.get_draw();
		if(null === draw){
			DaisyIO.set_err_(err_, "warning", "Export", "internal dummy element can not generate");
			return null;
		}

		Renderer.rendering_(dummy_rhandle, Doc.get_diagram(doc));

		dummy_rhandle.get_focus_group().remove();

		return draw;
	}

	static get_svg_string_from_doc_(doc, err_)
	{
		let draw = DaisyIO.get_dummy_draw_(doc, err_);
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

	static write_export_doc(filepath, doc, err_)
	{
		const ext = DaisyIO.get_ext_from_filepath(filepath);

		let res;
		switch(ext){
			case '.png':
				res = DaisyIO.write_export_png_doc_(filepath, doc, err_);
				break;
			case '.svg':
				res = DaisyIO.write_export_svg_doc_(filepath, doc, err_);
				break;
			case '.puml':
				res = DaisyIO.write_export_plantuml_doc_(filepath, doc, err_);
				break;
			default:
				DaisyIO.set_err_(err_,
					"warning", "Export", sprintf("invalid file type. :`%s`", filepath));
				return false;
		}

		return res;
	}

	static write_export_png_doc_(filepath, doc, err_)
	{
		let draw = DaisyIO.get_dummy_draw_(doc, err_);
		if(null === draw){
			return false;
		}

		let svg_elem = draw.node;
		// saveSvgAsPng(svg_elem, filepath, {scale: 3});
		svgAsPngUri(svg_elem,
			{
				'scale': 4,
				'backgroundColor': "#fff",
			},
			function(uri) {
			const decoded = dataUriToBuffer(uri)
			try{
				fs.writeFileSync(filepath, decoded);
			}catch(err){
				DaisyIO.set_err_(err_, "warning", "Export", err.message);
				err.callback(err_);
				return;
			}
		});

		return true;
	}

	static write_export_svg_doc_(filepath, doc, err_)
	{
		const strdata = DaisyIO.get_svg_string_from_doc_(doc, err_);
		if(null === strdata){
			DaisyIO.set_err_(err_, "warning", "Export", "svg convert error");
			return false;
		}

		try{
			fs.writeFileSync(filepath, strdata);
		}catch(err){
			DaisyIO.set_err_(err_, "warning", "Export", sprintf("writeFile error:`%s`", filepath));
			return false;
		}

		return true;
	}

	static write_export_plantuml_doc_(filepath, doc, err_)
	{
		const strdata = Doc.get_plantuml_string(doc, err_);
		if(null === strdata){
			DaisyIO.set_err_(err_, "warning", "Export", err_.message);
			return false;
		}

		try{
			fs.writeFileSync(filepath, strdata);
		}catch(err){
			DaisyIO.set_err_(err_, "warning", "Export", sprintf("writeFile error:`%s`", filepath));
			return false;
		}

		return true;
	}
};

