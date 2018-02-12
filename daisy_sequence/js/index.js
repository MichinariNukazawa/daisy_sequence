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

	rendering(draw, doc);
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

	rerendering();
}

function callback_tool_change(tool_kind)
{
	console.log(tool_kind);
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

		rerendering();
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

function rendering(draw, doc)
{
	const diagram = Doc.get_diagram(doc);

	draw.size(diagram.width, diagram.height);

	for(let i = 0; i < diagram.diagram_elements.length; i++){
		if('lifeline' == diagram.diagram_elements[i].kind){
			draw_lifeline(draw, diagram, diagram.diagram_elements[i]);
		}else if('message' == diagram.diagram_elements[i].kind){
			draw_message(draw, diagram, diagram.diagram_elements[i], null);
		}else if('flugment' == diagram.diagram_elements[i].kind){
			draw_flugment(draw, diagram.diagram_elements[i]);
		}else{
			console.error("%d %d", i, diagram.diagram_elements[i].kind);
			alert('internal error');
		}
	}

	// focusing
	const focus = Doc.get_focus(doc);
	const elements = Focus.get_elements(focus);
	for(let i = 0; i < elements.length; i++){
		let rect = Rect.abs(Element.get_rect(elements[i]));
		if(null == rect){
			alert('internal error');
		}else{
			rect = Rect.expand(rect, [3,3]);
			let rect_ = draw.rect(rect.width, rect.height).move(rect.x, rect.y).attr({
				'stroke':		'#3af',
				'fill-opacity':		'0',
				'stroke-width':		'1.5',
			});
		}
	}

	// ** frame resize icon
	let group_edge_icon = draw.group().addClass('edge_icon')
	group_edge_icon.svg(edge_icon_svg).move(diagram.width - 32, diagram.height - 32).attr({
		'opacity':	0.3,
	});

	// ** frame
	let rect = draw.rect(diagram.width, diagram.height).attr({
		'stroke':		'#ddd',
		'fill-opacity':		'0',
		'stroke-width':		'2',
	});
}

function callback_history_change_doc(doc, event_kind)
{
	let s = sprintf("history: %2d/%2d(%s)",
			doc.diagram_history_index,
			doc.diagram_historys.length - 1,
			event_kind);
	document.getElementById('history_info').textContent = s;

	callback_focus_change(Doc.get_focus(doc), doc);

		rerendering();
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
	console.log('mousedown');

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

	rerendering();
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
	console.log('mouseup');

	mouse_state.is_down = false;

	let focus = Doc.get_focus(get_current_doc());
	Focus.set_diagram_resize(focus, false);

	callback_focus_change();

	rerendering();
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

	rerendering();
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

	rerendering();
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

	rerendering();
}

function rerendering()
{
	get_draw().clear();
	rendering(get_draw(), get_current_doc());
}

function draw_lifeline(draw, diagram, lifeline)
{
	let message_of_create = Diagram.get_end_side_message_from_lifeline_id(diagram, lifeline.id, 'create');
	if(null !== message_of_create){
		lifeline.y = message_of_create.y;
	}

	// 空の名前を表示しようとすると、lifelineの表示が消えて位置計算もおかしくなるので、対処する
	const show_name = (! /^\s*$/.test(lifeline.text))? lifeline.text : '-';
	let text = draw.text(show_name).move(lifeline.x, lifeline.y).font({
		'fill': '#000' ,
		'size': '150%'
	});

	const attr = {
		'stroke':		'#e7c902',
		'fill-opacity':		'0',
		'stroke-width':		'3',
	};
	const padding = 5;
	const radius = 3;

	let b = text.bbox();
	let box = {
		'x': (b.x - padding),
		'y': b.y,
		'width': b.width + (padding * 2),
		'height': b.height,
	};
	draw.rect(box.width, box.height).move(box.x, box.y)
		.attr(attr).radius(radius);

	if(! lifeline.hasOwnProperty('work')){
		lifeline.work = {};
	}
	lifeline.work.rect = Object.assign({}, box);

	const height_offset = 10;
	let stop_message = Diagram.get_end_side_message_from_lifeline_id(diagram, lifeline.id, 'stop');

	let line_point = {
		// 'x': box.x + (box.width / 2),
		'x': b.x,
		'y': box.y + (box.height),
	};
	let y_end;
	if(null === stop_message){
		y_end = diagram.height - height_offset;
	}else{
		y_end = stop_message.y;
	}
	var line = draw.line(
			line_point.x,
			line_point.y,
			line_point.x + 0,
			y_end
			)
		.stroke({
			'width': '2',
		})
	.attr({
		'stroke-opacity':	'0.6',
		'stroke-dasharray':	'5',
	});

}

function draw_message(draw, diagram, message, parent_message)
{
	let is_found = false;
	let is_lost = false;

	if('reply' === message.message_kind){
		message.start = object_deepcopy(parent_message.end);
		message.end = object_deepcopy(parent_message.start);
		delete message.start.position_x;
		delete message.end.position_x;
	}

	var position = {
		'x': 0,
		'y': 0,
		'width': 0,
		'height': 0,
	};

	let is_touch_start_side_lifeline = false;
	if(message.start.hasOwnProperty('lifeline_id') && 0 <= message.start.lifeline_id){
		is_touch_start_side_lifeline = true;

		let lifeline = Diagram.get_element_from_id(diagram, message.start.lifeline_id);
		if(null === lifeline || 'lifeline' != lifeline.kind){
			console.error(message.start);
			alert('bug');
			return;
		}
		position.x = lifeline.x;
	}else if(message.start.hasOwnProperty('position_x')){
		position.x = message.start.position_x;
		is_found = true;
	}else{
		console.error(message.start);
		alert('bug');
	}

	position.y = message.y;

	let is_touch_end_side_lifeline = false;
	if(message.end.hasOwnProperty('lifeline_id') && 0 <= message.end.lifeline_id){
		is_touch_end_side_lifeline = true;

		let lifeline = Diagram.get_element_from_id(diagram, message.end.lifeline_id);
		if(null == lifeline || 'lifeline' != lifeline.kind){
			console.error(message.end);
			alert('bug');
			return;
		}
		position.width = lifeline.x - position.x;
	}else if(message.end.hasOwnProperty('position_x')){
		position.width = message.end.position_x - position.x;
		is_lost = true;
	}else{
		console.error(message.start);
		alert('bug');
	}

	if(! message.hasOwnProperty('work')){
		message.work = {};
	}
	message.work.rect = Object.assign({}, position);
	message.work.rect.y -= 8;
	message.work.rect.height = 24;

	if(message.start.hasOwnProperty('lifeline_id')
			&& message.end.hasOwnProperty('lifeline_id')
			&& message.start.lifeline_id == message.end.lifeline_id
			&& 0 <= message.start.lifeline_id){
		draw_message_turnback(draw, position);
	}else{
		var line = draw.line(
				position.x,
				position.y,
				position.x + position.width,
				position.y + position.height)
			.stroke({
				'width': '2',
			});

		if('reply' == message.message_kind){
			line.attr({
				'stroke-dasharray':	'10',
			});
		}

		if('stop' != message.end_kind){
			draw_message_array_of_foot(draw, position, message.message_kind);
		}else{
			draw_message_stop_icon_of_foot(draw, position);
		}

		if(is_found){
			const size = 16;
			const point_head = Message.get_start_side_point(position, [(size/2), 0]);
			draw.circle(size).move(point_head.x - (size/2), point_head.y - (size/2));
		}
		if(is_lost){
			const size = 16;
			const point_end = Message.get_end_side_point(position, [(size/2), 0]);
			draw.circle(size).move(point_end.x - (size/2), point_end.y - (size/2))
				//.fill('none').stroke('#00f');
				.fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
		}
	}

	let text_point = {'x': position.x, 'y': position.y};
	if(position.width < 0){
		text_point.x += position.width;
	}
	const text_offset = 8;
	text_point.x += text_offset;
	text_point.y += text_offset;
	let text = draw.text(message.text).move(text_point.x, text_point.y);

	if(is_touch_end_side_lifeline){
		if(message.hasOwnProperty('spec') && null !== message.spec){
			draw_spec(draw, diagram, message, position);

			if(is_touch_end_side_lifeline && is_touch_start_side_lifeline){
				if(message.hasOwnProperty('reply_message') && null !== message.reply_message){
					draw_message(draw, diagram, message.reply_message, message);
				}
			}
		}
	}
}

function draw_spec(draw, diagram, message, parent_message_position)
{
	if(! (message.hasOwnProperty('spec') && null !== message.spec)){
		console.error('bug');
		return;
	}

	let spec = message.spec;

	const attr = {
		'stroke':		'#000',
		'fill':			'#fff',
		'stroke-width':		'1.2',
	};

	const width = 5;
	let height = spec.height;
	if(message.hasOwnProperty('reply_message') && null !== message.reply_message){
		height = message.reply_message.y - message.y;
	}

	let end_point = Message.get_end_side_point(parent_message_position, [0,0]);
	let box = {
		'x':		end_point.x - 1,
		'y':		end_point.y + spec.y_offset,
		'width':	width,
		'height':	height,
	};
	box = Rect.abs(box);
	draw.rect(box.width, box.height).move(box.x, box.y).attr(attr);

	if(! spec.hasOwnProperty('work')){
		spec.work = {};
	}
	spec.work.rect = Object.assign({}, box);
}

function draw_flugment(draw, flugment)
{
	// ** contents
	const show_text = (! /^\s*$/.test(flugment.text))? flugment.text : '-';
	let text = draw.text(show_text).move(flugment.x, flugment.y);

	// ** frame
	const padding = 5;
	const radius = 1;
	const b = text.bbox();
	const box = {
		'x': (b.x - padding),
		'y': b.y,
		'width': b.width + (padding * 2),
		'height': b.height,
	};
	const attr = {
		'stroke':		'#000',
		'stroke-width':		'1',
		'fill-opacity':		'0.1',
		'fill': '#1080FF',
	};
	draw.rect(box.width, box.height).move(box.x, box.y)
		.radius(radius).attr(attr);

	// ** work.rect
	if(! flugment.hasOwnProperty('work')){
		flugment.work = {};
	}
	flugment.work.rect = Object.assign({}, box);
}

function draw_message_turnback(draw, position)
{
	const height = 10;
	const points = [
		position.x, position.y,
		position.x + 100, position.y + 0,
		position.x + 100, position.y + height,
		position.x + 0, position.y + height,
	];
	let polyline = draw.polyline(points).stroke({ width: 2, }).fill('none');

	const point = {'x': position.x, 'y': position.y + height};
	let array_polyline = draw_array_top(draw, point, [6, 6], true);
}

function draw_message_array_of_foot(draw, position, message_kind)
{
	let point = {'x': position.x + position.width, 'y': position.y + position.height};
	let offset = [8, 8];
	if(0 < position.width){
		offset = [-8, -8];
	}

	let polyline = draw_array_top(draw, point, offset, ('sync' == message_kind));
}

function draw_array_top(draw, point, offset, is_fill)
{
	let points = [
		point.x + offset[0], point.y + offset[1],
		point.x, point.y,
		point.x + offset[0], point.y - offset[1],
	];

		let polyline = draw.polyline(points).stroke({ width: 3, linecap: 'round', });
		if(!is_fill){
			polyline.fill('none').plot();
		}

		return polyline;
}

function draw_message_stop_icon_of_foot(draw, position)
{
	const size = 16;
	const point_end = Message.get_end_side_point(position, [0, 0]);
	let l0 = [
		point_end.x - (size/2), point_end.y - (size/2),
		point_end.x + (size/2), point_end.y + (size/2),
	];
	draw.line(l0).fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
	let l1 = [
		point_end.x + (size/2), point_end.y - (size/2),
		point_end.x - (size/2), point_end.y + (size/2),
	];
	draw.line(l1).fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
}

