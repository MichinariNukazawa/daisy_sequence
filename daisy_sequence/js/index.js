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
	];

	let doc = {
		'width': 400,
		'height': 300,
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
		draw_timeline(draw, current_diagram[i]);
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

	let height = 100;
	let line_position = {
		'x': box.x + (box.width / 2),
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

