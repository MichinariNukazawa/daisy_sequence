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

let mouse_state = {
	'mousedown_point': { 'x': 0, 'y': 0, },
	'point': { 'x': 0, 'y': 0, },
	'is_down': false,
	'is_small_move': true,
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

	tool = new Tool();
	tool.add_callback_tool_change(callback_tool_change);

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

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
}

function callback_tool_change(tool_kind)
{
	// console.log(tool_kind);
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

		Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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

		Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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
	mouse_state.is_small_move = true;
	mouse_state.is_down = true;

	const tool_kind = tool.get_tool_kind();
	const tool_info = tool.get_tool_info_from_kind(tool_kind);
	if(null === tool_info){
		console.error(tool_kind);
	}else{
		tool_info.callback_mousedown(mouse_state);
	}

	let focus = Doc.get_focus(daisy.get_current_doc());
	Focus.preservation_element_source_position(focus);

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
}

function callback_mouseup_canvas(e)
{
	// console.log('mouseup');
	if(null === daisy.get_current_doc()){
		return;
	}

	mouse_state.is_down = false;

	let focus = Doc.get_focus(daisy.get_current_doc());
	Focus.finalize_edit(focus);

	callback_focus_change();

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
}

function callback_mousemove_canvas(e)
{
	if(null === daisy.get_current_doc()){
		return;
	}

	let point = {
		'x': e.offsetX,
		'y': e.offsetY,
	};
	let s = sprintf('(%3d,%3d) %s', point.x, point.y, (mouse_state.is_down)? 'down':'up' );
	document.getElementById('mouse_position').textContent = s;

	mouse_state.point = point;

	if(! mouse_state.is_down){
		return;
	}

	if(mouse_state.is_small_move){
		const sensitive = 6;
		if(sensitive > Math.abs(mouse_state.mousedown_point.x - point.x)
				&& sensitive > Math.abs(mouse_state.mousedown_point.y - point.y)){
			return;
		}else{
			mouse_state.is_small_move = false;

			Doc.history_add(daisy.get_current_doc());
		}
	}

	let focus = Doc.get_focus(daisy.get_current_doc());

	let elements = Focus.get_elements(focus);
	let diagram = daisy.get_current_diagram();

	if(1 === elements.length && 'message' === elements[0].kind){
		const message_side = focus.focus_state.message_side;
		Message.change_side_from_point(elements[0], diagram, message_side, point);
	}

	const move = Point.sub(point, mouse_state.mousedown_point);
	Focus.move_by_source_position(focus, move);

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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
	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
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

	Renderer.rerendering(rendering_handle, daisy.get_current_doc());
}

