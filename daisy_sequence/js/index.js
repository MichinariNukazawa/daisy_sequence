'use strict';

var SVG = require('svg.js');

window.onload = function(e){
	let diagram = [
	{
		'kind': 'lifeline',
		'id': 0,
		'x': 100,
		'y': 30,
		'text': 'Object1'
	},
	{
		'kind': 'lifeline',
		'id': 1,
		'x': 250,
		'y': 30,
		'text': 'Object2'
	},
	{
		'kind':		'message',
		'id':		2,
		'y':		70,
		'start':	{'position_x': 20},		// for found
		'end':		{'lifeline': 'Object1'},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'messageA',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		120,
		'start':	{'lifeline': 'Object1'},
		'end':		{'lifeline': 'Object2'},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'messageB',
	},
	];

	let doc = {
		'width': 400,
		'height': 350,
		'diagram_index': 0,
		'diagram_history': [diagram],
	};

	let draw = SVG('drawing').size(doc.width, doc.height);
	let rect = draw.rect(doc.width, doc.height).attr({
		'stroke':		'#ddd',
		'fill-opacity':		'0',
		'stroke-width':		'2',
	});

	let current_diagram = doc.diagram_history[doc.diagram_index];
	for(let i = 0; i < current_diagram.length; i++){
		if('lifeline' == current_diagram[i].kind){
			draw_timeline(draw, current_diagram[i]);
		}else if('message' == current_diagram[i].kind){
			draw_message(draw, current_diagram, current_diagram[i]);
		}else{
			error.log("%d %d", i, current_diagram[i].kind);
			alert('internal error');
		}
	}
}

function draw_timeline(draw, timeline)
{
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

	let height = 300;
	let line_position = {
		// 'x': box.x + (box.width / 2),
		'x': b.x,
		'y': box.y + (box.height),
		'width': 0,
		'height': height,
	};
	var line = draw.line(
			line_position.x,
			line_position.y,
			line_position.x + line_position.width,
			line_position.y + line_position.height)
		.stroke({
			'width': '2',
		})
	.attr({
		'stroke-opacity':	'0.6',
		'stroke-dasharray':	'10',
	});

}

function draw_message(draw, current_diagram, message)
{
	let is_found = false;

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
		let lifeline = get_lifeline_from_name(current_diagram, message.start.lifeline);
		if(null == lifeline){
			error.log(message.start);
			alert('bug');
			return;
		}
		position.x = lifeline.x;
	}else{
		error.log(message.start);
		alert('bug');
	}

	position.y = message.y;

	if(message.end.hasOwnProperty('lifeline')){
		let lifeline = get_lifeline_from_name(current_diagram, message.end.lifeline);
		if(null == lifeline){
			error.log(message.end);
			alert('bug');
			return;
		}
		position.width = lifeline.x - position.x;
	}else{
		alert('nop');
	}

	var line = draw.line(
			position.x,
			position.y,
			position.x + position.width,
			position.y + position.height)
		.stroke({
			'width': '2',
		});

	draw_message_array_of_foot(draw, position, message.message_kind);

	if(is_found){
		let point_head = get_message_point_head(position);
		let size = 16;
		draw.circle(size).move(point_head.x - (size/2), point_head.y - (size/2))
	}

	let text_point = {'x': position.x, 'y': position.y};
	if(position.width < 0){
		text_point.x += position.width;
	}
	const text_offset = 8;
	text_point.x += text_offset;
	text_point.y += text_offset;
	let text = draw.text(message.text).move(text_point.x, text_point.y);
}

function get_lifeline_from_name(current_diagram, lifeline)
{
	for(let i = 0; i < current_diagram.length; i++){
		if('lifeline' == current_diagram[i].kind){
			if(lifeline == current_diagram[i].text){
				return current_diagram[i];
			}
		}
	}

	alert('bug');
	return null;
}

function get_message_point_head(position)
{
	let point;
	if(0 < position.width){
		point = {'x': position.x, 'y': position.y};
	}else{
		point = {'x': position.x + position.width, 'y': position.y + position.height};
	}

	return point;
}

function draw_message_array_of_foot(draw, position, message_kind)
{
	let point = {'x': position.x, 'y': position.y};
	let offset = [8, 8];
	if(0 < position.width){
		point = {'x': position.x + position.width, 'y': position.y + position.height};
		offset = [-8, -8];
	}
	let points = [
		point.x + offset[0], point.y + offset[1],
		point.x, point.y,
		point.x + offset[0], point.y - offset[1],
	];

	let polyline = draw.polyline(points).stroke({ width: 3, linecap: 'round', });
	if('sync' != message_kind){
		polyline.fill('none').plot();
	}
}

