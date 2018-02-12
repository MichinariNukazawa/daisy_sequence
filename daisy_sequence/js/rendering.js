'use strict';

class Renderer{
	static rerendering(draw, doc)
	{
		get_draw().clear();
		Renderer.rendering(draw, doc);
	}

	static rendering(draw, doc)
	{
		const diagram = Doc.get_diagram(doc);

		draw.size(diagram.width, diagram.height);

		for(let i = 0; i < diagram.diagram_elements.length; i++){
			if('lifeline' == diagram.diagram_elements[i].kind){
				Renderer.draw_lifeline(draw, diagram, diagram.diagram_elements[i]);
			}else if('message' == diagram.diagram_elements[i].kind){
				Renderer.draw_message(draw, diagram, diagram.diagram_elements[i], null);
			}else if('flugment' == diagram.diagram_elements[i].kind){
				Renderer.draw_flugment(draw, diagram.diagram_elements[i]);
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

	static draw_lifeline(draw, diagram, lifeline)
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

	static draw_message(draw, diagram, message, parent_message)
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
			Renderer.draw_message_turnback(draw, position);
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
				Renderer.draw_message_array_of_foot(draw, position, message.message_kind);
			}else{
				Renderer.draw_message_stop_icon_of_foot(draw, position);
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
				Renderer.draw_spec(draw, diagram, message, position);

				if(is_touch_end_side_lifeline && is_touch_start_side_lifeline){
					if(message.hasOwnProperty('reply_message') && null !== message.reply_message){
						Renderer.draw_message(draw, diagram, message.reply_message, message);
					}
				}
			}
		}
	}

	static draw_spec(draw, diagram, message, parent_message_position)
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

	static draw_flugment(draw, flugment)
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

	static draw_message_turnback(draw, position)
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
		let array_polyline = Renderer.draw_array_top(draw, point, [6, 6], true);
	}

	static draw_message_array_of_foot(draw, position, message_kind)
	{
		let point = {'x': position.x + position.width, 'y': position.y + position.height};
		let offset = [8, 8];
		if(0 < position.width){
			offset = [-8, -8];
		}

		let polyline = Renderer.draw_array_top(draw, point, offset, ('sync' == message_kind));
	}

	static draw_array_top(draw, point, offset, is_fill)
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

	static draw_message_stop_icon_of_foot(draw, position)
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
};

