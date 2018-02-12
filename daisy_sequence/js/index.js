'use strict';

var SVG = require('svg.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require("fs");
const path = require('path');

let doc_collection = new DocCollection();

let current_doc_id = -1;
let tool = null;

let draw = null;
let edge_icon_svg;

let mouse_state = {
	'mousedown_point': { 'x': 0, 'y': 0, },
	'point': { 'x': 0, 'y': 0, },
	'is_down': false,
	'is_small_move': true,
};

function get_draw()
{
	return draw;
}

class Tool{
	constructor(){
		this.tool_kind = 'allow';

		this.tools = [];
		this.tools.push({
			'kind':		'allow',
			'element':	document.getElementById('tool__allow'),
		});
		this.tools.push({
			'kind':		'lifeline',
			'element':	document.getElementById('tool__lifeline'),
		});
		this.tools.push({
			'kind':		'message',
			'element':	document.getElementById('tool__message'),
		});
		this.tools.push({
			'kind':		'flugment',
			'element':	document.getElementById('tool__flugment'),
		});

		this.callback_tool_changes = [];

		this.init_();

		this.rendering_();
	}

	init_()
	{
		for(let i = 0; i < this.tools.length; i++){
			this.tools[i].element.addEventListener('click', this.callback_clicked_tool_.bind(this), false);
		}
	}

	rendering_()
	{
		for(let i = 0; i < this.tools.length; i++){
			if(this.tools[i].kind === this.get_tool_kind()){
				this.tools[i].element.classList.add('tool-selected');
			}else{
				this.tools[i].element.classList.remove('tool-selected');
			}
		}
	}

	callback_clicked_tool_(e)
	{
		// console.log(e.target);

		let next_tool_kind = '';
		for(let i = 0; i < this.tools.length; i++){
			if(e.target == this.tools[i].element){
				next_tool_kind = this.tools[i].kind;
				break;
			}
		}
		if('' === next_tool_kind){
			console.error(e.target);
			alert('internal error');
			return;
		}
		this.tool_kind = next_tool_kind;

		for(let i = 0; i < this.callback_tool_changes.length; i++){
			this.callback_tool_changes[i](this.tool_kind);
		}

		this.rendering_();
	}

	add_callback_tool_change(callback){
		this.callback_tool_changes.push(callback);
	}

	get_tool_kind()
	{
		return this.tool_kind;
	}
};


window.onload = function(e){
	current_doc_id = doc_collection.create_doc();
	let doc = doc_collection.get_doc_from_id(current_doc_id);
	let diagram = Doc.get_diagram(doc);

	try{
		const filepath = path.join(__dirname, 'image/edge.svg');
		edge_icon_svg = fs.readFileSync(filepath, 'utf8');
	}catch(err){
		console.error(err);
	}

	draw = SVG('drawing').size(diagram.width, diagram.height);

	Doc.add_event_listener_history_change(doc, callback_history_change_doc);
	let focus = Doc.get_focus(doc);
	Focus.add_event_listener_focus_change(focus, callback_focus_change, doc);

	Renderer.rerendering(get_draw(), get_current_doc());
	callback_history_change_doc(doc, '-');

	// document.addEventListener('mousemove', callback);
	document.getElementById('drawing').addEventListener('mousemove', callback_mousemove_drawing);
	document.getElementById('drawing').addEventListener('mousedown', callback_mousedown_drawing);
	// fix mousedown -> mouseup can not pair mouseup call when drawing area out of range.
	document.addEventListener('mouseup', callback_mouseup_drawing);
	// document.getElementById('drawing').addEventListener('mouseup', callback_mouseup_drawing);

	let edit_control__axis_x = document.getElementById('edit-control__axis-x');
	add_event_listener_first_input_with_history(edit_control__axis_x, callback_input_with_history_axis_x);
	let edit_control__axis_y = document.getElementById('edit-control__axis-y');
	add_event_listener_first_input_with_history(edit_control__axis_y, callback_input_with_history_axis_y);

	let editor__lifeline_name = document.getElementById('editor__lifeline-name');
	add_event_listener_first_input_with_history(editor__lifeline_name, callback_input_with_history_text);

	document.getElementById('editor__message-spec').addEventListener('change', callback_change_message_spec, false);
	document.getElementById('editor__message-reply').addEventListener('change', callback_change_message_reply, false);

	tool = new Tool();
	tool.add_callback_tool_change(callback_tool_change);

	//! snatching keys html input/textarea elements
	document.onkeydown = function(e) {
		if (e.ctrlKey && e.key === 'z') {
			// Ctrl+z(Undo) textarea
			e.preventDefault();

			let current_doc = get_current_doc();
			if(null !== current_doc){
				Doc.undo(current_doc);
			}
		}
		if(e.keyCode == 46){
			// Delete key
			delete_current_focus_elements();
		}
	}

}

function get_current_doc()
{
	return doc_collection.get_doc_from_id(current_doc_id);
}

function get_current_diagram()
{
	let doc = get_current_doc();
	if(null === doc){
		console.error('');
		return null;
	}

	return Doc.get_diagram(doc);
}

function get_current_single_focus_element()
{
	const focus = Doc.get_focus(get_current_doc());
	const elements = Focus.get_elements(focus);
	if(1 !== elements.length){
		return null;
	}else{
		return elements[0];
	}
}

function delete_current_focus_elements()
{
	{
		let doc = get_current_doc();
		if(null === doc){
			return;
		}

		let focus_elements = Focus.get_elements(Doc.get_focus(doc));
		if(0 === focus_elements.length){
			return;
		}

		Doc.history_add(get_current_doc());
	}

	let doc = get_current_doc();
	let diagram = Doc.get_diagram(doc);
	let focus = Doc.get_focus(doc);
	let focus_elements = Focus.get_elements(focus);

	Diagram.delete_elements(diagram, focus_elements);
	Focus.clear(focus);

	Renderer.rerendering(get_draw(), get_current_doc());
}

function callback_tool_change(tool_kind)
{
	// console.log(tool_kind);
}

let is_focusin_first = false;
function add_event_listener_first_input_with_history(textarea_element, callback)
{
	textarea_element.addEventListener('focusin', function(){is_focusin_first = true;}, false);
	textarea_element.addEventListener('input', function(e){
		if(is_focusin_first){
			let focus = Doc.get_focus(get_current_doc());
			if(! Focus.is_focusing(focus)){
				return;
			}

			let elements = Focus.get_elements(focus);
			if(1 !== elements.length){
				return;
			}
			Doc.history_add(get_current_doc());

			is_focusin_first = false;
		}

		callback();

		Renderer.rerendering(get_draw(), get_current_doc());
	}, false);
}

function callback_input_with_history_axis_x()
{
	let element = get_current_single_focus_element();
	if(null === element){
		return;
	}

	let v = document.getElementById('edit-control__axis-x').value;
	if(element.hasOwnProperty('x') && /[1-9][0-9]*/.test(v)){
		element.x = parseInt(v, 10);
	}

	console.log("X %s", v);
}

function callback_input_with_history_axis_y()
{
	let element = get_current_single_focus_element();
	if(null === element){
		return;
	}

	let v = document.getElementById('edit-control__axis-y').value;
	if(element.hasOwnProperty('y') && /[1-9][0-9]*/.test(v)){
		element.y = parseInt(v, 10);
	}

	console.log("Y %s", v);
}

function callback_input_with_history_text()
{
	let element = get_current_single_focus_element();
	if(null === element){
		return;
	}

	let s = document.getElementById('editor__lifeline-name').value;
	element.text = s;
}

function callback_history_change_doc(doc, event_kind)
{
	let s = sprintf("history: %2d/%2d(%s)",
			doc.diagram_history_index,
			doc.diagram_historys.length - 1,
			event_kind);
	document.getElementById('history_info').textContent = s;

	callback_focus_change(Doc.get_focus(doc), doc);

		Renderer.rerendering(get_draw(), get_current_doc());
}

function callback_focus_change(focus, user_data)
{
	let lifeline_name_elem = document.getElementById('editor__lifeline-name');
	let message_spec_elem = document.getElementById('editor__message-spec');
	let message_reply_elem = document.getElementById('editor__message-reply');
	let edit_control__axis_x = document.getElementById('edit-control__axis-x');
	let edit_control__axis_y = document.getElementById('edit-control__axis-y');

	// const doc = user_data;
	const focus_element = get_current_single_focus_element();
	if(null === focus_element){
		lifeline_name_elem.disabled = true;
		message_spec_elem.disabled = true;
		message_reply_elem.disabled = true;
		edit_control__axis_x.disabled = true;
		edit_control__axis_y.disabled = true;
	}else{
		lifeline_name_elem.disabled = false;
		message_spec_elem.disabled = false;
		message_reply_elem.disabled = false;
		edit_control__axis_x.disabled = false;
		edit_control__axis_y.disabled = false;
	}

	if(null !== focus_element && focus_element.hasOwnProperty('text')){
		lifeline_name_elem.value = focus_element.text;
	}else{
		lifeline_name_elem.disabled = true;
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
}

function callback_mousedown_drawing(e)
{
	// console.log('mousedown');

	let point = {
		'x': e.offsetX,
		'y': e.offsetY,
	};
	// console.log('%d %d', point.x, point.y);

	mouse_state.mousedown_point = point;
	mouse_state.is_small_move = true;
	mouse_state.is_down = true;


	const tool_kind = tool.get_tool_kind();

	if('allow' === tool_kind){
		callback_mousedown_drawing_allow(point);
	}else if('lifeline' === tool_kind){
		callback_mousedown_drawing_lifeline(point);
	}else if('message' === tool_kind){
		callback_mousedown_drawing_message(point);
	}else if('flugment' === tool_kind){
		callback_mousedown_drawing_flugment(point);
	}else{
		console.error(tool_kind);
	}

	Renderer.rerendering(get_draw(), get_current_doc());
}

function callback_mousedown_drawing_allow(point)
{
	let diagram = get_current_diagram();
	let focus = Doc.get_focus(get_current_doc());

	// ** focus element
	let element = Diagram.get_element_of_touch(diagram, mouse_state.point);
	Focus.set_element(focus, element);

	// ** focus message side
	if(null !== element && 'message' === element.kind){
		const side = Element.get_lr_side_of_touch(element, mouse_state.point);
		focus.focus_state.side = side;
		const message_side = Message.get_message_side_from_element_side(element, side);
		focus.focus_state.message_side = message_side;

		return;
	}

	// ** focus diagram area size
	if(32 > Math.abs(diagram.width - point.x) && 32 > Math.abs(diagram.height - point.y)){
		console.log('resize');
		Focus.set_diagram_resize(focus, true);
	}
}

function callback_mousedown_drawing_lifeline(point)
{
	{
		Doc.history_add(get_current_doc());
	}

	let diagram = get_current_diagram();

	let i = 0;
	let lifeline_name;
	let exist_lifeline;
	do{
		lifeline_name = 'New Lifeline' + i;
		exist_lifeline = Diagram.get_lifeline_from_name(diagram, lifeline_name);
		i++;
	}while(null !== exist_lifeline);

	let data = {
		'text': lifeline_name,
		'x': point.x,
	};
	let lifeline = Diagram.create_append_element(diagram, 'lifeline', data);
	if(null === lifeline){
		console.error('');
		return;
	}

	let focus = Doc.get_focus(get_current_doc());
	Focus.set_element(focus, lifeline);
}

function callback_mousedown_drawing_message(point)
{
	{
		Doc.history_add(get_current_doc());
	}

	let diagram = get_current_diagram();

	let data = {
		'y': point.y,
		'start': {'position_x': point.x},
		'end': {'position_x': point.x + 10},
	};
	let message = Diagram.create_append_element(diagram, 'message', data);
	if(null === message){
		console.error('');
		return;
	}

	Message.change_side_from_point(message, diagram, 'start', point);

	let focus = Doc.get_focus(get_current_doc());
	Focus.set_element(focus, message);
	focus.focus_state.message_side = 'end';
}

function callback_mousedown_drawing_flugment(point)
{
	{
		Doc.history_add(get_current_doc());
	}

	let diagram = get_current_diagram();

	let data = {
		'y': point.y,
		'x': point.x,
	};
	let flugment = Diagram.create_append_element(diagram, 'flugment', data);
	if(null === flugment){
		console.error('');
		return;
	}

	let focus = Doc.get_focus(get_current_doc());
	Focus.set_element(focus, flugment);
}

function callback_mouseup_drawing(e)
{
	// console.log('mouseup');

	mouse_state.is_down = false;

	let focus = Doc.get_focus(get_current_doc());
	Focus.set_diagram_resize(focus, false);

	callback_focus_change();

	Renderer.rerendering(get_draw(), get_current_doc());
}

function callback_mousemove_drawing(e)
{
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

			Doc.history_add(get_current_doc());
		}
	}

	let focus = Doc.get_focus(get_current_doc());

	const move = {
		'x': e.movementX,
		'y': e.movementY,
	};
	let elements = Focus.get_elements(focus);
	let diagram = get_current_diagram();

	if(1 === elements.length && 'message' === elements[0].kind){
		const message_side = focus.focus_state.message_side;
		Message.change_side_from_point(elements[0], diagram, message_side, point);
	}

	for(let i = 0; i < elements.length; i++){
		move_element(diagram, elements[i], move);
	}

	if(true === Focus.get_diagram_resize(focus)){
		Diagram.resize_from_diff(diagram, move);
	}

	Renderer.rerendering(get_draw(), get_current_doc());
}

function callback_change_message_spec()
{
	{
		let element = get_current_single_focus_element();
		if(null === element){
			return;
		}
		if('message' !== element.kind){
			return;
		}
	}

	let message_spec_elem = document.getElementById('editor__message-spec');
	const checked = message_spec_elem.checked;

	Doc.history_add(get_current_doc());
	let element = get_current_single_focus_element();

	//if(! message_spec_elem.checked){
	message_spec_elem.checked = checked;
	if(! checked){
		element.spec = null;
	}else{
		let diagram = get_current_diagram();
		let spec = Diagram.create_element(diagram, 'spec', {});
		element.spec = spec;
	}

	Renderer.rerendering(get_draw(), get_current_doc());
}

function callback_change_message_reply()
{
	{
		let element = get_current_single_focus_element();
		if(null === element){
			return;
		}
		if('message' !== element.kind){
			return;
		}
	}

	let message_reply_elem = document.getElementById('editor__message-reply');
	const checked = message_reply_elem.checked;

	Doc.history_add(get_current_doc());
	let element = get_current_single_focus_element();

	message_reply_elem.checked = checked;
	if(! checked){
		element.reply_message = null;
	}else{
		let diagram = get_current_diagram();
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

	Renderer.rerendering(get_draw(), get_current_doc());
}

