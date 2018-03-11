'use strict';

let SVG = require('svg.js');
// let saveSvgAsPng = require('save-svg-as-png').svgAsPngUri;
let svgAsPngUri = require('save-svg-as-png').svgAsPngUri;
let dataUriToBuffer = require('data-uri-to-buffer');
const sprintf = require('sprintf-js').sprintf;
const fs = require("fs");
const path = require('path');
const xml_formatter = require('xml-formatter');
let ad = new Ad();

let doc_collection = new DocCollection();

let default_title = 'daisy_sequence';
let tool = null;
let daisy = null;

let rendering_handle = null;
let edge_icon_svg;

const SENSITIVE = {
	'x': 24,
	'y': 6,
};

let mouse_state = {
	'mousedown_point': { 'x': 0, 'y': 0, },
	'point': { 'x': 0, 'y': 0, },
	'mode': 'none',
	'is_insensitive':{
		'x': true,
		'y': true,
		'first_one': true,
	},
};
class MouseState{
	static get_drug_rect(mouse_state){
		const drug_rect = {
			'x': mouse_state.mousedown_point.x,
			'y': mouse_state.mousedown_point.y,
			'width': mouse_state.point.x - mouse_state.mousedown_point.x,
			'height': mouse_state.point.y - mouse_state.mousedown_point.y,
		};

		return drug_rect;
	}
};


let arg = {
	'open_filepath': null,
};
function process_argument()
{
	let argv = remote.process.argv;
	if(argv[0].endsWith('electron') && argv[1] == '.'){
		argv.shift(), argv.shift();
	}else{
		argv.shift();
	}
	// console.log(argv);

	if(typeof argv[0] === 'string'){
		arg.open_filepath = argv[0];
	}

	// console.log(remote.getGlobal('sharedObject').osx_open_file);
	if(typeof remote.getGlobal('sharedObject').osx_open_file === 'string'){
		if(null === arg.open_filepath){
			arg.open_filepath = remote.getGlobal('sharedObject').osx_open_file;
		}
	}

	console.log(arg);
}

{
	/** documentにドラッグされた場合 / ドロップされた場合 */
	document.ondragover = document.ondrop = function(e) {
		e.preventDefault(); // イベントの伝搬を止めて、アプリケーションのHTMLとファイルが差し替わらないようにする
		return false;
	};
}

function initialize_drug_events()
{
	let canvas = document.getElementById('canvas');
	// console.debug(canvas);
	/** canvasエリアにドラッグされた場合 */
	canvas.ondragover = function () {
		return false;
	};
	/** canvasエリアから外れた or ドラッグが終了した */
	canvas.ondragleave = canvas.ondragend = function () {
		return false;
	};
	/** canvasエリアにドロップされた */
	canvas.ondrop = function (e) {
		e.preventDefault(); // イベントの伝搬を止めて、アプリケーションのHTMLとファイルが差し替わらないようにする

		if(1 !== e.dataTransfer.files.length){
			console.debug(e.dataTransfer.files);
			message_dialog(
				'info', "Open",
				"can drop file is single.");
			return false;
		}
		{
			const doc = daisy.get_current_doc();
			if(null !== doc){
				message_dialog(
					'info', "Open",
					"already opened document.");
				return false;
			}
		}

		const file = e.dataTransfer.files[0];
		let filepath = file.path;
		console.debug(filepath);

		if(-1 == DaisyIO.open_doc_from_path(filepath)){
			console.error(filepath);
			return;
		}

		console.log("Open from drop:`%s`", filepath);
		return false;
	};
}

window.onload = function(e){
	default_title = document.title;

	process_argument();

	try{
		const filepath = path.join(__dirname, 'image/edge.svg');
		edge_icon_svg = fs.readFileSync(filepath, 'utf8');
	}catch(err){
		console.error(err);
	}

	tool = new Tool();
	tool.add_callback_tool_change(callback_tool_change);

	rendering_handle = new RenderingHandle('canvas');

	daisy = new Daisy();
	daisy.add_event_listener_current_doc_change(callback_current_doc_change);

	if(null !== arg.open_filepath){
		let doc_id = DaisyIO.open_doc_from_path(arg.open_filepath);
		if(-1 === doc_id){
			console.error(arg.open_filepath);
		}
	}else{
		// NOP
	}

	// document.addEventListener('mousemove', callback);
	document.getElementById('canvas').addEventListener('mousemove', callback_mousemove_canvas);
	document.getElementById('canvas').addEventListener('mousedown', callback_mousedown_canvas);
	// fix mousedown -> mouseup can not pair mouseup call when canvas area out of range.
	document.addEventListener('mouseup', callback_mouseup_canvas);
	// document.getElementById('canvas').addEventListener('mouseup', callback_mouseup_canvas);

	let edit_control__axis_x = document.getElementById('edit-control__axis-x');
	add_event_listener_first_input_for_single_element_with_history(
		edit_control__axis_x, callback_input_with_history_axis_x);
	let edit_control__axis_y = document.getElementById('edit-control__axis-y');
	add_event_listener_first_input_for_single_element_with_history(
		edit_control__axis_y, callback_input_with_history_axis_y);
	let edit_control__axis_width = document.getElementById('edit-control__axis-width');
	add_event_listener_first_input_for_single_element_with_history(
		edit_control__axis_width, callback_input_with_history_axis_width);
	let edit_control__axis_height = document.getElementById('edit-control__axis-height');
	add_event_listener_first_input_for_single_element_with_history(
		edit_control__axis_height, callback_input_with_history_axis_height);

	let editor__fragment_kind = document.getElementById('editor__fragment-kind');
	add_event_listener_first_input_for_single_element_with_history(
		editor__fragment_kind, callback_input_fragment_kind_with_history);

	let editor__background_transparent = document.getElementById('editor__background-transparent');
	add_event_listener_first_input_for_single_element_with_history(
		editor__background_transparent, callback_input_editor__background_transparent_with_history);

	document.getElementById('editor__fragment-is_auto_size').addEventListener('change', callback_change_fragment_is_auto_size, false);

	let editor__element_text = document.getElementById('editor__element-text');
	add_event_listener_first_input_for_single_element_with_history(
		editor__element_text, callback_input_with_history_text);

	document.getElementById('editor__message-spec').addEventListener('change', callback_change_message_spec, false);
	document.getElementById('editor__message-reply').addEventListener('change', callback_change_message_reply, false);
	document.getElementById('editor__fragment__add-operand').addEventListener('click', callback_click_fragment_add_operand, false);

	let canvas__diagram_width = document.getElementById('canvas__diagram-width');
	add_event_listener_first_input_with_history(
		canvas__diagram_width, callback_input_with_history_diagram_width);
	let canvas__diagram_height = document.getElementById('canvas__diagram-height');
	add_event_listener_first_input_with_history(
		canvas__diagram_height, callback_input_with_history_diagram_height);

	canvas__diagram_width.min = Diagram.MIN_SIZE();
	canvas__diagram_width.max = Diagram.MAX_SIZE();
	canvas__diagram_height.min = Diagram.MIN_SIZE();
	canvas__diagram_height.max = Diagram.MAX_SIZE();

	//! snatching keys html input/textarea elements
	document.onkeydown = function(e) {
		if (e.ctrlKey && e.key === 'z') {
			// Ctrl+z(Undo) textarea
			e.preventDefault();

			let current_doc = daisy.get_current_doc();
			if(null !== current_doc){
				Doc.undo(current_doc);
			}
		}
	}

	initialize_drug_events();

	ad.start();
}

function delete_current_focus_elements()
{
	{
		let doc = daisy.get_current_doc();
		if(null === doc){
			return;
		}

		let focus_elements = Focus.get_elements(Doc.get_focus(doc));
		if(0 === focus_elements.length){
			return;
		}

		Doc.history_add(daisy.get_current_doc());
	}

	let doc = daisy.get_current_doc();
	let diagram = Doc.get_diagram(doc);
	let focus = Doc.get_focus(doc);
	let focus_elements = Focus.get_elements(focus);

	Diagram.delete_elements(diagram, focus_elements);
	Focus.clear(focus);

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_tool_change(tool_kind)
{
	// console.log(tool_kind);
	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

let is_focusin_first = false;
function add_event_listener_first_input_for_single_element_with_history(
	textarea_element, callback)
{
	let cb = function(e){
		if(is_focusin_first){
			let focus = Doc.get_focus(daisy.get_current_doc());
			if(! Focus.is_focusing(focus)){
				return;
			}

			let elements = Focus.get_elements(focus);
			if(1 !== elements.length){
				return;
			}
			Doc.history_add(daisy.get_current_doc());

			is_focusin_first = false;
		}

		callback();

		Renderer.rerendering(
			rendering_handle,
			daisy.get_current_diagram(),
			Doc.get_focus(daisy.get_current_doc()),
			mouse_state,
			tool.get_tool_kind());
	};
	textarea_element.addEventListener('focusin', function(){is_focusin_first = true;}, false);
	textarea_element.addEventListener('input', cb, false);
}

function add_event_listener_first_input_with_history(
	textarea_element, callback)
{
	let cb = function(e){
		if(is_focusin_first){
			Doc.history_add(daisy.get_current_doc());

			is_focusin_first = false;
		}

		callback();

		Renderer.rerendering(
			rendering_handle,
			daisy.get_current_diagram(),
			Doc.get_focus(daisy.get_current_doc()),
			mouse_state,
			tool.get_tool_kind());
	};
	textarea_element.addEventListener('focusin', function(){is_focusin_first = true;}, false);
	textarea_element.addEventListener('input', cb, false);
	textarea_element.addEventListener('focusout', function(){
		callback_current_doc_change(daisy.get_current_doc_id());
	}, false);
}

function callback_input_with_history_axis_value(value_name)
{
	let element = daisy.get_current_single_focus_element();
	if(null === element){
		return;
	}

	let v = document.getElementById('edit-control__axis-' + value_name).value;
	if(element.hasOwnProperty(value_name) && /[1-9][0-9]*/.test(v)){
		element[value_name] = parseInt(v, 10);
	}

	console.log("%s %s", value_name, v);
}

function callback_input_with_history_axis_x()
{
	callback_input_with_history_axis_value('x')
}

function callback_input_with_history_axis_y()
{
	callback_input_with_history_axis_value('y')
}

function callback_input_with_history_axis_width()
{
	callback_input_with_history_axis_value('width')
}

function callback_input_with_history_axis_height()
{
	callback_input_with_history_axis_value('height')
}

function callback_input_with_history_text()
{
	let element = daisy.get_current_single_focus_element();
	if(null === element){
		return;
	}

	let s = document.getElementById('editor__element-text').value;
	element.text = s;
}

function callback_input_fragment_kind_with_history()
{
	let element = daisy.get_current_single_focus_element();
	if(null === element){
		return;
	}

	let s = document.getElementById('editor__fragment-kind').value;
	element.fragment_kind = s;
}

function callback_input_editor__background_transparent_with_history()
{
	let element = daisy.get_current_single_focus_element();
	if(null === element){
		return;
	}

	let s = document.getElementById('editor__background-transparent').value;
	let v = parseInt(s, 10);
	element.background_opacity = v / 100.0;

	let editor__background_transparent_view = document.getElementById('editor__background-transparent-view');
	editor__background_transparent_view.textContent = sprintf("%3d", v) + '%';
}

function callback_input_with_history_diagram_width()
{
	let diagram = daisy.get_current_diagram();
	if(null === diagram){
		return;
	}

	let s = document.getElementById('canvas__diagram-width').value;
	let v = parseInt(s, 10);

	let size = Diagram.get_size(diagram);
	size.width = v;
	const res = Diagram.set_size(diagram, size);

	if(res){
		callback_current_doc_change(daisy.get_current_doc_id());
	}
}

function callback_input_with_history_diagram_height()
{
	let diagram = daisy.get_current_diagram();
	if(null === diagram){
		return;
	}

	let s = document.getElementById('canvas__diagram-height').value;
	let v = parseInt(s, 10);

	let size = Diagram.get_size(diagram);
	size.height = v;
	const res = Diagram.set_size(diagram, size);

	if(res){
		callback_current_doc_change(daisy.get_current_doc_id());
	}
}

function callback_history_change_doc(doc, event_kind)
{
	let s = sprintf("history: %2d/%2d(%s)",
		doc.diagram_history_index,
		doc.diagram_historys.length - 1,
		event_kind);
	document.getElementById('history_info').textContent = s;

	if('add' !== event_kind){
		callback_focus_change(Doc.get_focus(doc), doc);
		callback_current_doc_change(daisy.get_current_doc_id());
	}

	update_title_from_doc_id(daisy.get_current_doc_id());

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_on_save_doc(doc)
{
	update_title_from_doc_id(daisy.get_current_doc_id());
}

function callback_current_doc_change(doc_id)
{
	let canvas__diagram_width = document.getElementById('canvas__diagram-width');
	let canvas__diagram_height = document.getElementById('canvas__diagram-height');
	if(-1 === doc_id){
		canvas__diagram_width.disabled = true;
		canvas__diagram_height.disabled = true;

		document.title = default_title;
	}else{
		canvas__diagram_width.disabled = false;
		canvas__diagram_height.disabled = false;

		// console.log(doc_id);
		const doc = doc_collection.get_doc_from_id(doc_id);
		const diagram = Doc.get_diagram(doc);
		const size = Diagram.get_size(diagram);
		canvas__diagram_width.value = size.width;
		canvas__diagram_height.value = size.height;

		update_title_from_doc_id(doc_id);
	}
}

function update_title_from_doc_id(doc_id)
{
	const doc = doc_collection.get_doc_from_id(doc_id);
	const str_save = (Doc.is_on_save(doc)? '':'*');
	let filename = Doc.get_filename(doc);
	if(0 === filename.length){
		filename = '(untitled)';
	}
	const str = sprintf("%s%s  - daisy_sequence", str_save, filename);
	document.title = str;
}

function callback_focus_change(focus, user_data)
{
	let element_text_elem = document.getElementById('editor__element-text');
	let fragment_kind_elem = document.getElementById('editor__fragment-kind');
	let message_spec_elem = document.getElementById('editor__message-spec');
	let message_reply_elem = document.getElementById('editor__message-reply');
	let edit_control__axis_x = document.getElementById('edit-control__axis-x');
	let edit_control__axis_y = document.getElementById('edit-control__axis-y');
	let edit_control__axis_width = document.getElementById('edit-control__axis-width');
	let edit_control__axis_height = document.getElementById('edit-control__axis-height');
	let focus_info_elem = document.getElementById('focus_info');

	// const doc = user_data;
	const focus_element = daisy.get_current_single_focus_element();
	if(null === focus_element){
		element_text_elem.disabled = true;
		fragment_kind_elem.disabled = true;
		message_spec_elem.disabled = true;
		message_reply_elem.disabled = true;
		edit_control__axis_x.disabled = true;
		edit_control__axis_y.disabled = true;
		edit_control__axis_width.disabled = true;
		edit_control__axis_height.disabled = true;

		focus_info_elem.textContent = "[  ]";
	}else{
		element_text_elem.disabled = false;
		fragment_kind_elem.disabled = false;
		message_spec_elem.disabled = false;
		message_reply_elem.disabled = false;
		edit_control__axis_x.disabled = false;
		edit_control__axis_y.disabled = false;
		edit_control__axis_width.disabled = false;
		edit_control__axis_height.disabled = false;

		focus_info_elem.textContent = sprintf("[%2d]", focus_element.id);
	}

	if(null !== focus_element && focus_element.hasOwnProperty('text')){
		element_text_elem.value = focus_element.text;
	}else{
		element_text_elem.disabled = true;
	}

	if(null !== focus_element && 'message' === focus_element.kind && 'reply' !== focus_element.message_kind){
		let r;
		r = (focus_element.hasOwnProperty('spec') && null !== focus_element.spec);
		message_spec_elem.checked = r;
		r = (focus_element.hasOwnProperty('reply_message') && null !== focus_element.reply_message);
		message_reply_elem.checked = r;
	}else{
		message_spec_elem.disabled = true;
		message_reply_elem.disabled = true;
	}

	if(null !== focus_element && focus_element.hasOwnProperty('x')){
		edit_control__axis_x.value = focus_element.x;
	}else{
		edit_control__axis_x.disabled = true;
	}
	if(null !== focus_element && focus_element.hasOwnProperty('y')){
		edit_control__axis_y.value = focus_element.y;
	}else{
		edit_control__axis_y.disabled = true;
	}
	if(null !== focus_element && focus_element.hasOwnProperty('width')){
		edit_control__axis_width.value = focus_element.width;
	}else{
		edit_control__axis_width.disabled = true;
	}
	if(null !== focus_element && focus_element.hasOwnProperty('height')){
		edit_control__axis_height.value = focus_element.height;
	}else{
		edit_control__axis_height.disabled = true;
	}

	let fragment_is_auto_size_elem = document.getElementById('editor__fragment-is_auto_size');
	let editor__background_transparent = document.getElementById('editor__background-transparent');
	let editor__background_transparent_view = document.getElementById('editor__background-transparent-view');
	let editor__fragment__add_operand = document.getElementById('editor__fragment__add-operand');
	if(null !== focus_element && 'fragment' === focus_element.kind){
		fragment_kind_elem.disabled = false;
		fragment_kind_elem.value = focus_element.fragment_kind;

		fragment_is_auto_size_elem.disabled = false;
		fragment_is_auto_size_elem.checked = focus_element.is_auto_size;
		if(focus_element.is_auto_size){
			edit_control__axis_width.disabled = true;
			edit_control__axis_height.disabled = true;
		}

		editor__background_transparent.disabled = false;
		const v = focus_element.background_opacity * 100;
		editor__background_transparent.value = v;
		editor__background_transparent_view.textContent = sprintf("%3d", v) + '%';

		editor__fragment__add_operand.disabled = false;
	}else{
		fragment_kind_elem.disabled = true;
		fragment_is_auto_size_elem.disabled = true;
		editor__background_transparent.disabled = true;
		editor__background_transparent_view.textContent = '(---%)';
		editor__fragment__add_operand.disabled = true;
	}

}

function callback_mousedown_canvas(e)
{
	// console.log('mousedown');
	if(null === daisy.get_current_doc()){
		return;
	}

	let point = {
		'x': e.offsetX,
		'y': e.offsetY,
	};
	// console.log('%d %d', point.x, point.y);

	mouse_state.point = point;
	mouse_state.mousedown_point = point;
	mouse_state.is_insensitive = {
		'x': true,
		'y': true,
		'first_one': true,
	};

	const tool_kind = tool.get_tool_kind();
	const tool_info = tool.get_tool_info_from_kind(tool_kind);
	if(null === tool_info){
		console.error(tool_kind);
	}else{
		tool_info.callback_mousedown(mouse_state);
	}

	let diagram = daisy.get_current_diagram();
	Element.recursive_preservation_source_position(diagram.diagram_elements);

	let focus = Doc.get_focus(daisy.get_current_doc());
	if(0 === Focus.get_elements(focus).length){
		mouse_state.mode = 'focus_by_rect';
	}else{
		mouse_state.mode = 'move';
	}
	if('height-arrow' === tool_kind){
		mouse_state.mode = 'move_height';

		let diagram = daisy.get_current_diagram();
		object_make_member(diagram, 'work.source_position', {});
		diagram.work.source_position = {
			'width': diagram.width,
			'height': diagram.height,
		};
	}

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_mouseup_canvas(e)
{
	// console.log('mouseup');
	if(null === daisy.get_current_doc()){
		return;
	}

	mouse_state.mode = 'none';

	let focus = Doc.get_focus(daisy.get_current_doc());
	Element.finalize_edit_elements(Focus.get_elements(focus));

	callback_focus_change();

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_mousemove_canvas(e)
{
	if(null === daisy.get_current_doc()){
		return;
	}

	const point = {
		'x': e.offsetX,
		'y': e.offsetY,
	};
	mouse_state.point = point;

	let s = sprintf('(%3d,%3d) %12s', point.x, point.y, mouse_state.mode);
	document.getElementById('mouse_position').textContent = s;

	const func_mousemove_move = function (mouse_state){
		const func_append_focus_in_fragment_rect = function(){
			let focus = Doc.get_focus(daisy.get_current_doc());
			let elements = Focus.get_elements(focus);
			let diagram = daisy.get_current_diagram();

			if(! (1 === elements.length && 'fragment' === elements[0].kind)){
				return true;
			}

			if('' !== focus.focus_state.edge){
				return true;
			}

			let element = elements[0];

			const rect = Rect.abs(Element.get_rect(element));
			if(null === rect){
				console.error(element);
			}else{
				const elements_ = Diagram.get_elements_in_rect(diagram, rect);
				for(let i = 0; i < elements_.length; i++){
					Focus.append_element(focus, elements_[i]);
				}
			}

			return true;
		};

		if(SENSITIVE.x < Math.abs(mouse_state.mousedown_point.x - mouse_state.point.x)){
			mouse_state.is_insensitive.x = false;
		}
		if(SENSITIVE.y < Math.abs(mouse_state.mousedown_point.y - mouse_state.point.y)){
			mouse_state.is_insensitive.y = false;
		}

		if(mouse_state.is_insensitive.x && mouse_state.is_insensitive.y){
			return;
		}

		if(mouse_state.is_insensitive.first_one){
			Doc.history_add(daisy.get_current_doc());
			func_append_focus_in_fragment_rect();

			mouse_state.is_insensitive.first_one = false;
		}

		let focus = Doc.get_focus(daisy.get_current_doc());
		let elements = Focus.get_elements(focus);
		let diagram = daisy.get_current_diagram();

		let move = Point.sub(mouse_state.point, mouse_state.mousedown_point);
		if(mouse_state.is_insensitive.x){
			move.x = 0;
		}
		if(mouse_state.is_insensitive.y){
			move.y = 0;
		}

		if(1 === elements.length && 'message' === elements[0].kind){
			const message_side = focus.focus_state.message_side;
			Message.change_side_from_point(elements[0], diagram, message_side, point);
		}

		if(1 === elements.length && 'fragment' === elements[0].kind){
			if('right-bottom' === focus.focus_state.edge){
				Element.resize_element_by_source_position(elements[0], move);
				return;
			}
		}

		Element.move_elements_by_source_position(Focus.get_elements(focus), move);
	};

	const func_mousemove_move_height = function (mouse_state){
		if(SENSITIVE.x < Math.abs(mouse_state.mousedown_point.x - mouse_state.point.x)){
			mouse_state.is_insensitive.x = false;
		}
		if(SENSITIVE.y < Math.abs(mouse_state.mousedown_point.y - mouse_state.point.y)){
			mouse_state.is_insensitive.y = false;
		}

		if(mouse_state.is_insensitive.x && mouse_state.is_insensitive.y){
			return;
		}

		if(mouse_state.is_insensitive.first_one){
			Doc.history_add(daisy.get_current_doc());

			mouse_state.is_insensitive.first_one = false;
		}

		let focus = Doc.get_focus(daisy.get_current_doc());

		let elements = Focus.get_elements(focus);
		let diagram = daisy.get_current_diagram();

		let move = Point.sub(point, mouse_state.mousedown_point);
		if(mouse_state.is_insensitive.x){
			move.x = 0;
		}
		if(mouse_state.is_insensitive.y){
			move.y = 0;
		}
		move.x = 0;

		Element.move_elements_by_source_position(Focus.get_elements(focus), move);

		{
			let size = Diagram.get_size(diagram);
			size.height = diagram.work.source_position.height + move.y;
			Diagram.set_size(diagram, size);

			daisy.change(); // update document size
		}
	};

	const func_mousemove_focus_by_rect = function (mouse_state){
		let focus = Doc.get_focus(daisy.get_current_doc());
		const diagram = daisy.get_current_diagram();

		Focus.clear(focus);

		let drug_rect = MouseState.get_drug_rect(mouse_state);
		drug_rect = Rect.abs(drug_rect);

		const elements = Diagram.get_elements_in_rect(diagram, drug_rect);
		for(let i = 0; i < elements.length; i++){
				Focus.append_element(focus, elements[i]);
		}
	};

	switch(mouse_state.mode){
		case 'none':
			return;
			break;
		case 'move':
			func_mousemove_move(mouse_state);
			break;
		case 'move_height':
			func_mousemove_move_height(mouse_state);
			break;
		case 'focus_by_rect':
			func_mousemove_focus_by_rect(mouse_state);
			break;
		default:
			break;
	}

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_change_fragment_is_auto_size()
{
	{
		let element = daisy.get_current_single_focus_element();
		if(null === element){
			return;
		}
		if('fragment' !== element.kind){
			return;
		}
	}

	let fragment_is_auto_size_elem = document.getElementById('editor__fragment-is_auto_size');
	const checked = fragment_is_auto_size_elem.checked;

	Doc.history_add(daisy.get_current_doc());
	let element = daisy.get_current_single_focus_element();

	fragment_is_auto_size_elem.checked = checked;
	element.is_auto_size = checked;

	callback_focus_change(Doc.get_focus(daisy.get_current_doc()), null);
	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_change_message_spec()
{
	{
		let element = daisy.get_current_single_focus_element();
		if(null === element){
			return;
		}
		if('message' !== element.kind){
			return;
		}
	}

	let message_spec_elem = document.getElementById('editor__message-spec');
	const checked = message_spec_elem.checked;

	Doc.history_add(daisy.get_current_doc());
	let element = daisy.get_current_single_focus_element();

	//if(! message_spec_elem.checked){
	message_spec_elem.checked = checked;
	if(! checked){
		element.spec = null;
	}else{
		let diagram = daisy.get_current_diagram();
		let spec = Diagram.create_element(diagram, 'spec', {});
		element.spec = spec;
	}

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_change_message_reply()
{
	{
		let element = daisy.get_current_single_focus_element();
		if(null === element){
			return;
		}
		if('message' !== element.kind){
			return;
		}
	}

	let message_reply_elem = document.getElementById('editor__message-reply');
	const checked = message_reply_elem.checked;

	Doc.history_add(daisy.get_current_doc());
	let element = daisy.get_current_single_focus_element();

	message_reply_elem.checked = checked;
	if(! checked){
		element.reply_message = null;
	}else{
		let diagram = daisy.get_current_diagram();
		if(element.hasOwnProperty('spec') && null !== element.spec){
			// NOP
		}else{
			let spec = Diagram.create_element(diagram, 'spec', {});
			element.spec = spec;
		}
		let reply_message = Diagram.create_element(diagram, 'reply_message', {});
		reply_message.y = element.y + element.spec.height;
		element.reply_message = reply_message;
	}

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

function callback_click_fragment_add_operand()
{
	{
		let element = daisy.get_current_single_focus_element();
		if(null === element){
			return;
		}
		if('fragment' !== element.kind && 'operand' !== element.kind ){
			return;
		}
	}

	Doc.history_add(daisy.get_current_doc());
	let element = daisy.get_current_single_focus_element();

	let diagram = daisy.get_current_diagram();
	if('operand' === element.kind ){
		element = Diagram.get_parent_element_from_id(diagram, element.id);
	}

	Fragment.add_create_operand(element, diagram, {});

	Renderer.rerendering(
		rendering_handle,
		daisy.get_current_diagram(),
		Doc.get_focus(daisy.get_current_doc()),
		mouse_state,
		tool.get_tool_kind());
}

