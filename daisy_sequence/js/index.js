'use strict';

var SVG = require('svg.js');

window.onload = function(e){
	let diagram_elements = [
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
		'start':	{'position_x': 20},		// from found
		'end':		{'lifeline': 'Object1'},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'message\nfrom found',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		120,
		'start':	{'lifeline': 'Object1'},	// lifeline to lifeline
		'end':		{'lifeline': 'Object2'},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'lifeline to lifeline',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		150,
		'start':	{'lifeline': 'Object2'},	// turnback to lifeline
		'end':		{'lifeline': 'Object2'},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'turnback',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		170,
		'start':	{'lifeline': 'Object2'},
		'end':		{'lifeline': 'Object1'},
		'end_kind':	'none',
		'message_kind':	'reply',	// reply
		'text':		'message of reply',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		220,
		'start':	{'lifeline': 'Object1'},
		'end':		{'position_x': 280},				// lost
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'message to lost',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		250,
		'start':	{'lifeline': 'Object1'},
		'end':		{'position_x': 280},				// lost
		'end_kind':	'none',
		'message_kind':	'async',					// async
		'text':		'message async to lost',
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		300,
		'start':	{'lifeline': 'Object1'},
		'end':		{'lifeline': 'Object2'},
		'end_kind':	'stop',						// stop to lifeline
		'message_kind':	'sync',
		'text':		'stop to lifeline',
	},
	];

	let diagram = {
		'width': 400,
		'height': 450,
		'diagram_elements': diagram_elements,
	};

	let doc = {
		'diagram_history_index': 0,
		'diagram_history': [diagram],
	};

	let current_diagram = doc.diagram_history[doc.diagram_history_index];

	let draw = SVG('drawing').size(current_diagram.width, current_diagram.height);
	let rect = draw.rect(current_diagram.width, current_diagram.height).attr({
		'stroke':		'#ddd',
		'fill-opacity':		'0',
		'stroke-width':		'2',
	});

	for(let i = 0; i < current_diagram.diagram_elements.length; i++){
		if('lifeline' == current_diagram.diagram_elements[i].kind){
			draw_timeline(draw, current_diagram, current_diagram.diagram_elements[i]);
		}else if('message' == current_diagram.diagram_elements[i].kind){
			draw_message(draw, current_diagram, current_diagram.diagram_elements[i]);
		}else{
			console.error("%d %d", i, current_diagram.diagram_elements[i].kind);
			alert('internal error');
		}
	}
}

function draw_timeline(draw, current_diagram, timeline)
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

	const height_offset = 10;
	let message_by_the_end = null;
	for(let i = 0; i < current_diagram.diagram_elements.length; i++){
		let element = current_diagram.diagram_elements[i];
		if('message' != element.kind){
			continue;
		}
		if(! element.end.hasOwnProperty('lifeline')){
			continue;
		}
		if(timeline.text != element.end.lifeline){
			continue;
		}
		if('stop' == element.end_kind){
			message_by_the_end = element;
			break;
		}
	}

	let line_point = {
		// 'x': box.x + (box.width / 2),
		'x': b.x,
		'y': box.y + (box.height),
	};
	let y_end;
	if(null == message_by_the_end){
		y_end = current_diagram.height - height_offset;
	}else{
		y_end = message_by_the_end.y;
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

function draw_message(draw, current_diagram, message)
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
		let lifeline = get_lifeline_from_name(current_diagram, message.start.lifeline);
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
		let lifeline = get_lifeline_from_name(current_diagram, message.end.lifeline);
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
}

function draw_message_turnback(draw, position)
{
	console.log(position);

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

function get_lifeline_from_name(current_diagram, lifeline)
{
	for(let i = 0; i < current_diagram.diagram_elements.length; i++){
		if('lifeline' == current_diagram.diagram_elements[i].kind){
			if(lifeline == current_diagram.diagram_elements[i].text){
				return current_diagram.diagram_elements[i];
			}
		}
	}

	alert('bug');
	return null;
}

function get_message_point_head(position, offset)
{
	let point;
	if(0 < position.width){
		point = {'x': position.x, 'y': position.y};
		point.x += offset[0];
		point.y += offset[1];
	}else{
		point = {'x': position.x + position.width, 'y': position.y + position.height};
		point.x -= offset[0];
		point.y -= offset[1];
	}

	return point;
}

function get_message_point_foot(position, offset)
{
	let point = {'x': position.x + position.width, 'y': position.y + position.height};
	if(0 < position.width){
		point.x += offset[0];
		point.y += offset[1];
	}else{
		point.x -= offset[0];
		point.y -= offset[1];
	}
	return point;
}

function draw_message_array_of_foot(draw, position, message_kind)
{
	console.log(position);
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

