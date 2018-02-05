'use strict';

var SVG = require('svg.js');
const sprintf = require('sprintf-js').sprintf;
let doc_collection = new DocCollection();
let current_doc_id = -1;

let draw = null;

let edit_state = {
	'element': null,
};

let mouse_state = {
	'point': { 'x': 0, 'y': 0, },
	'is_down': false,
};

function get_draw()
{
	return draw;
}


window.onload = function(e){
	doc_collection.init();
	current_doc_id = doc_collection.create_doc();
	let doc = doc_collection.get_doc_from_id(current_doc_id);
	let diagram = Doc.get_diagram(doc);

	draw = SVG('drawing').size(diagram.width, diagram.height);
	let rect = draw.rect(diagram.width, diagram.height).attr({
		'stroke':		'#ddd',
		'fill-opacity':		'0',
		'stroke-width':		'2',
	});

	rendering(draw, diagram);
	show_history();

	// document.addEventListener('mousemove', callback);
	document.getElementById('drawing').addEventListener('mousemove', callback_mousemove_drawing);
	document.getElementById('drawing').addEventListener('mousedown', callback_mousedown_drawing);
	document.getElementById('drawing').addEventListener('mouseup', callback_mouseup_drawing);

	document.getElementById('add-lifeline').addEventListener('click', callback_clicked_add_lifeline, false);
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

function show_history()
{
	let current_doc = get_current_doc();
	let s = sprintf("history: %d/%d",
				current_doc.diagram_history_index + 1,
				current_doc.diagram_historys.length);
	document.getElementById('history_info').textContent = s;
}

function rendering(draw, diagram)
{
	for(let i = 0; i < diagram.diagram_elements.length; i++){
		if('lifeline' == diagram.diagram_elements[i].kind){
			draw_timeline(draw, diagram, diagram.diagram_elements[i]);
		}else if('message' == diagram.diagram_elements[i].kind){
			draw_message(draw, diagram, diagram.diagram_elements[i]);
		}else{
			console.error("%d %d", i, diagram.diagram_elements[i].kind);
			alert('internal error');
		}
	}

	// focusing
	if(null !== edit_state.element){
		let rect = Element.get_rect(edit_state.element);
		if(null == rect){
			alert('internal error');
		}else{
			rect = rect_expand(rect, [3,3]);
			let rect_ = draw.rect(rect.width, rect.height).move(rect.x, rect.y).attr({
				'stroke':		'#3af',
				'fill-opacity':		'0',
				'stroke-width':		'1.5',
	});
		}
	}
}

function callback_mousedown_drawing(e){
	/*
	let point = {
		'x': e.clientX,
		'y': e.clientY,
	};
	console.log('%d %d', point.x, point.y);
	*/

	Doc.history_add(get_current_doc());
	show_history();

	mouse_state.is_down = true;

	let diagram = get_current_diagram();
	let element = Diagram.get_element_of_touch(diagram, mouse_state.point);

	edit_state.element = element;
}

function callback_mouseup_drawing(e){
	mouse_state.is_down = false;

	if(null === edit_state.element){
		// is not editing
		Doc.history_add_cancel(get_current_doc());
		show_history();
	}
	rerendering();
}

function callback_mousemove_drawing(e){
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

	if(null == edit_state.element){
		return;
	}

	const move = {
		'x': e.movementX,
		'y': e.movementY,
	};
	move_element(get_current_diagram(), edit_state.element, move);

	rerendering();
}

function callback_clicked_add_lifeline()
{
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
		'x': diagram.width - 150,
	};
	let lifeline = Lifeline.create(data);
	if(null === lifeline){
		console.error();
		return;
	}

	if(! Diagram.add_element(diagram, lifeline)){
		console.error();
		return;
	}

	rerendering();
}

function rerendering()
{
	get_draw().clear();
	rendering(get_draw(), get_current_diagram());
}

function draw_timeline(draw, diagram, timeline)
{
	let message_of_create = get_message_of_timeline_create(diagram, timeline.text);
	if(null !== message_of_create){
		timeline.y = message_of_create.y;
	}

	let text = draw.text(timeline.text).move(timeline.x, timeline.y).font({
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

	if(! timeline.hasOwnProperty('work')){
		timeline.work = {};
	}
	timeline.work.rect = Object.assign({}, box);

	const height_offset = 10;
	let message_of_end = get_message_of_timeline_end(diagram, timeline.text);

	let line_point = {
		// 'x': box.x + (box.width / 2),
		'x': b.x,
		'y': box.y + (box.height),
	};
	let y_end;
	if(null == message_of_end){
		y_end = diagram.height - height_offset;
	}else{
		y_end = message_of_end.y;
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

function draw_message(draw, diagram, message)
{
	let is_found = false;
	let is_lost = false;

	var position = {
		'x': 0,
		'y': 0,
		'width': 0,
		'height': 0,
	};
	if(message.start.hasOwnProperty('position_x')){
		position.x = message.start.position_x;
		is_found = true;
	}else if(message.start.hasOwnProperty('lifeline')){
		let lifeline = get_lifeline_from_name(diagram, message.start.lifeline);
		if(null == lifeline){
			console.error(message.start);
			alert('bug');
			return;
		}
		position.x = lifeline.x;
	}else{
		console.error(message.start);
		alert('bug');
	}

	position.y = message.y;

	if(message.end.hasOwnProperty('lifeline')){
		let lifeline = get_lifeline_from_name(diagram, message.end.lifeline);
		if(null == lifeline){
			console.error(message.end);
			alert('bug');
			return;
		}
		position.width = lifeline.x - position.x;
	}else if(message.end.hasOwnProperty('position_x')){
		position.width = message.end.position_x;
		is_lost = true;
	}else{
		alert('nop');
	}

	if(! message.hasOwnProperty('work')){
		message.work = {};
	}
	message.work.rect = Object.assign({}, position);
	message.work.rect.y -= 16;
	message.work.rect.height = 16;

	if(message.start.hasOwnProperty('lifeline')
			&& message.end.hasOwnProperty('lifeline')
			&& message.start.lifeline == message.end.lifeline){
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
			const point_head = get_message_point_head(position, [(size/2), 0]);
			draw.circle(size).move(point_head.x - (size/2), point_head.y - (size/2));
		}
		if(is_lost){
			const size = 16;
			const point_foot = get_message_point_foot(position, [(size/2), 0]);
			draw.circle(size).move(point_foot.x - (size/2), point_foot.y - (size/2))
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

	if(message.hasOwnProperty('spec') && null !== message.spec){
		draw_spec(draw, diagram, message, position);
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
	let height = 0;
	if(spec.end.hasOwnProperty('height')){
		height = spec.end.height;
	}else if(spec.end.hasOwnProperty('reply')){
		let message_of_end = get_message_of_timeline_end(diagram, message.end.lifeline);
		if(null != message_of_end){
			height = message_of_end.y - message.y;
		}
	}
	if(height < 0){
		console.error(message);
		console.log(message);
		return;
	}
	if(0 == height){
		console.error(message);
		console.log(message);
		return;
	}

	let foot_point = get_message_point_foot(parent_message_position, [0,0])
	let box = {
		'x':		foot_point.x - 1,
		'y':		foot_point.y + spec.y_offset,
		'width':	width,
		'height':	height,
	};
	draw.rect(box.width, box.height).move(box.x, box.y).attr(attr);

	if(! spec.hasOwnProperty('work')){
		spec.work = {};
	}
	spec.work.rect = Object.assign({}, box);
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
	const point_foot = get_message_point_foot(position, [0, 0]);
	let l0 = [
		point_foot.x - (size/2), point_foot.y - (size/2),
		point_foot.x + (size/2), point_foot.y + (size/2),
	];
	draw.line(l0).fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
	let l1 = [
		point_foot.x + (size/2), point_foot.y - (size/2),
		point_foot.x - (size/2), point_foot.y + (size/2),
	];
	draw.line(l1).fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
}

