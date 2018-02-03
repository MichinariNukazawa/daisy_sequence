'use strict';

var SVG = require('svg.js');

window.onload = function(e){
	var draw = SVG('drawing').size(300, 300);
	var rect = draw.rect(100, 100).attr({ fill: '#f06' });
	var text = draw.text('hello!');
	text.move(10,110).font({ fill: '#44f' })
}

