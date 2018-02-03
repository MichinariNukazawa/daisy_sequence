'use strict';

var SVG = require('svg.js');

window.onload = function(e){
	let draw = SVG('drawing').size(400, 300);
	let rect = draw.rect(400, 300).attr({
		'stroke':		'#ddd',
		'fill-opacity':		'0',
		'stroke-width':		'2',
	});

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

	draw_timeline(draw, diagram[0]);
	draw_timeline(draw, diagram[1]);
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

