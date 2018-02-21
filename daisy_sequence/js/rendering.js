'use strict';

class RenderingHandle{
	constructor(elemId)
	{
		this.draw = null;
		this.groups = [];

		this.draw = SVG(elemId).size(0, 0);
		this.clear();
	}

	get_draw()
	{
		return this.draw;
	}

	get_other_group()
	{
		return this.groups.other_group;
	}

	get_lifeline_group()
	{
		return this.groups.lifeline_group;
	}

	get_spec_group()
	{
		return this.groups.spec_group;
	}

	get_focus_group()
	{
		return this.groups.focus_group;
	}

	clear()
	{
		this.draw.clear();
		this.groups.lifeline_group = this.draw.group().addClass('dd__lifeline-group');
		this.groups.spec_group = this.draw.group().addClass('dd__spec-group');
		this.groups.other_group = this.draw.group().addClass('dd__other-group');
		this.groups.focus_group = this.draw.group().addClass('dd__focus-group');
	}
};

class Renderer{
	static rerendering(rendering_handle, doc)
	{
		let other_group = rendering_handle.get_other_group();
		if(null === other_group){
			return;
		}

		rendering_handle.clear();
		Renderer.rendering(rendering_handle, doc);
	}

	static rendering(rendering_handle, doc)
	{
		let other_group = rendering_handle.get_other_group();

		if(null === doc){
			console.debug('Rendering:doc is null');
			return;
		}

		const diagram = Doc.get_diagram(doc);

		let draw = rendering_handle.get_draw();
		draw.size(diagram.width, diagram.height);

		for(let i = 0; i < diagram.diagram_elements.length; i++){
			if('lifeline' == diagram.diagram_elements[i].kind){
				Renderer.draw_lifeline(rendering_handle, diagram, diagram.diagram_elements[i]);
			}else if('message' == diagram.diagram_elements[i].kind){
				Renderer.draw_message(rendering_handle, diagram, diagram.diagram_elements[i], null);
			}else if('fragment' == diagram.diagram_elements[i].kind){
				Renderer.draw_fragment(rendering_handle, diagram.diagram_elements[i]);
			}else{
				const msg = sprintf("internal error: invalid element kind `%s`(%d,%d)",
						diagram.diagram_elements[i].kind,
						diagram.diagram_elements[i].id,
						i
						);
				console.error(msg);
				alert(msg);
			}
		}

		Renderer.draw_focus(rendering_handle, doc);

		// ** frame
		let rect = other_group.rect(diagram.width, diagram.height).attr({
			'stroke':		'#ddd',
			'fill-opacity':		'0',
			'stroke-width':		'2',
		});
	}

	static draw_focus(rendering_handle, doc)
	{
		let focus_group = rendering_handle.get_focus_group();

		// focusing
		const focus = Doc.get_focus(doc);
		const elements = Focus.get_elements(focus);
		for(let i = 0; i < elements.length; i++){
			let rect = Rect.abs(Element.get_rect(elements[i]));
			if(null == rect){
				alert('internal error');
			}else{
				rect = Rect.expand(rect, [3,3]);
				let rect_ = focus_group.rect(rect.width, rect.height).move(rect.x, rect.y).attr({
					'stroke':		'#3af',
					'fill-opacity':		'0',
					'stroke-width':		'1.5',
				});
			}
		}
	}

	static draw_lifeline(rendering_handle, diagram, lifeline)
	{
		let lifeline_group = rendering_handle.get_lifeline_group();

		let message_of_create = Diagram.get_end_side_message_from_lifeline_id(diagram, lifeline.id, 'create');
		if(null !== message_of_create){
			lifeline.y = message_of_create.y;
		}

		// 空の名前を表示しようとすると、lifelineの表示が消えて位置計算もおかしくなるので、対処する
		const show_name = (! /^\s*$/.test(lifeline.text))? lifeline.text : '-';
		let text = lifeline_group.text(show_name).move(lifeline.x, lifeline.y).font({
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
		const offset = [0, 1];

		let b = text.bbox();
		let box = {
			'x': (b.x - padding),
			'y': b.y,
			'width': b.width + (padding * 2) + offset[0],
			'height': b.height + offset[1],
		};
		lifeline_group.rect(box.width, box.height).move(box.x, box.y)
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
		var line = lifeline_group.line(
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

	static draw_message(rendering_handle, diagram, message, parent_message)
	{
		let other_group = rendering_handle.get_other_group();

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

		let is_turnback = false;
		if(message.start.hasOwnProperty('lifeline_id')
				&& message.end.hasOwnProperty('lifeline_id')
				&& message.start.lifeline_id == message.end.lifeline_id
				&& 0 <= message.start.lifeline_id){
			let svg_elem = Renderer.draw_message_turnback(rendering_handle, position);
			is_turnback = true;
			let b = svg_elem.bbox();
			message.work.rect = Object.assign({}, b);
		}else{
			var line = other_group.line(
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
				Renderer.draw_message_array_of_foot(rendering_handle, position, message.message_kind);
			}else{
				Renderer.draw_message_stop_icon_of_foot(rendering_handle, position);
			}

			if(is_found){
				const size = 16;
				const point_head = Message.get_start_side_point(position, [(size/2), 0]);
				other_group.circle(size).move(point_head.x - (size/2), point_head.y - (size/2));
			}
			if(is_lost){
				const size = 16;
				const point_end = Message.get_end_side_point(position, [(size/2), 0]);
				other_group.circle(size).move(point_end.x - (size/2), point_end.y - (size/2))
					//.fill('none').stroke('#00f');
					.fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
			}
		}

		let text_point = {'x': position.x, 'y': position.y};
		if(position.width < 0){
			text_point.x += position.width;
		}
		if(is_turnback){
			text_point.y += 10;
		}
		const text_offset = [18, 2];
		text_point.x += text_offset[0];
		text_point.y += text_offset[1];
		let text = other_group.text(message.text).move(text_point.x, text_point.y);

		if(is_touch_end_side_lifeline){
			if(message.hasOwnProperty('spec') && null !== message.spec){
				Renderer.draw_spec(rendering_handle, diagram, message, position);

				if(is_touch_end_side_lifeline && is_touch_start_side_lifeline){
					if(message.hasOwnProperty('reply_message') && null !== message.reply_message){
						Renderer.draw_message(rendering_handle, diagram, message.reply_message, message);
					}
				}
			}
		}
	}

	static draw_spec(rendering_handle, diagram, message, parent_message_position)
	{
		let spec_group = rendering_handle.get_spec_group();

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
		spec_group.rect(box.width, box.height).move(box.x, box.y).attr(attr);

		if(! spec.hasOwnProperty('work')){
			spec.work = {};
		}
		spec.work.rect = Object.assign({}, box);
	}

	static draw_fragment(rendering_handle, fragment)
	{
		let other_group = rendering_handle.get_other_group();

		let fragment_group = rendering_handle.get_spec_group().addClass('fragment-group');

		const padding = [5, 0];
		// ** fragment_kind
		let fragment_kind_text = null;
		let fragment_kind_size;
		{
			if('' == fragment.fragment_kind || '(comment)' == fragment.fragment_kind){
				fragment_kind_size = [0, 0];
			}else{
				fragment_kind_text = fragment_group.text(fragment.fragment_kind).move(fragment.x, fragment.y);
				const b = fragment_kind_text.bbox();
				fragment_kind_size = [
					b.width,
					b.height,
				];

				// *** fragment_kind frame
				let points = [
					b.x - padding[0], b.y + b.height,
					b.x + b.width, b.y + b.height,
					b.x + b.width + 5 , b.y + b.height - 5,
					b.x + b.width + 5 , b.y,
				];
				let fragment_kind_polyline = other_group.polyline(points)
					.stroke({ width: 1, linecap: 'round', }).fill('none');
			}
		}

		// ** contents
		const show_text = (! /^\s*$/.test(fragment.text))? fragment.text : '-';
		let text = fragment_group.text(show_text)
			.move(fragment.x, fragment_kind_size[1] + fragment.y);

		// ** frame
		const radius = 1;
		const b = text.bbox();
		if(fragment.is_auto_size){
			fragment.width = b.width;
			fragment.height = b.height;
		}
		let box = {
			'x':		b.x,
			'y':		b.y - fragment_kind_size[1],
			'width':	Math.max(fragment.width, fragment_kind_size[0]),
			'height':	fragment.height + fragment_kind_size[1],
		};
		box = Rect.expand(box, padding);
		box = Rect.add_size(box, [8, 2]);
		const attr = {
			'stroke':		'#000',
			'stroke-width':		'1',
			'fill-opacity':		fragment.background_opacity,
			'fill': '#1080FF',
		};
		let background_rect = fragment_group.rect(box.width, box.height).move(box.x, box.y)
			.radius(radius).attr(attr);

		// ** frame resize icon
		if(! fragment.is_auto_size){
			let group_edge_icon = fragment_group.group().addClass('fragment__edge-icon');
			group_edge_icon.svg(edge_icon_svg)
				.move(box.x + box.width - 16 - 8, box.y + box.height - 16 - 8).scale(0.5, 0.5).attr({
					'opacity':	0.3,
				});
		}

		// ** reorder
		if(null !== fragment_kind_text){
			background_rect.after(fragment_kind_text);
		}
		background_rect.after(text);

		// ** work.rect
		if(! fragment.hasOwnProperty('work')){
			fragment.work = {};
		}
		fragment.work.rect = Object.assign({}, box);

		return fragment_group;
	}

	static draw_message_turnback(rendering_handle, position)
	{
		let other_group = rendering_handle.get_other_group();

		const height = 10;
		const points = [
			position.x, position.y,
			position.x + 100, position.y + 0,
			position.x + 100, position.y + height,
			position.x + 0, position.y + height,
		];
		let polyline = other_group.polyline(points).stroke({ width: 2, }).fill('none');

		const point = {'x': position.x, 'y': position.y + height};
		let array_polyline = Renderer.draw_array_top(rendering_handle, point, [6, 6], true);

		return polyline;
	}

	static draw_message_array_of_foot(rendering_handle, position, message_kind)
	{
		let other_group = rendering_handle.get_other_group();

		let point = {'x': position.x + position.width, 'y': position.y + position.height};
		let offset = [8, 8];
		if(0 < position.width){
			offset = [-8, -8];
		}

		let polyline = Renderer.draw_array_top(rendering_handle, point, offset, ('sync' == message_kind));
	}

	static draw_array_top(rendering_handle, point, offset, is_fill)
	{
		let other_group = rendering_handle.get_other_group();

		let points = [
			point.x + offset[0], point.y + offset[1],
			point.x, point.y,
			point.x + offset[0], point.y - offset[1],
		];

			let polyline = other_group.polyline(points).stroke({ width: 3, linecap: 'round', });
			if(!is_fill){
				polyline.fill('none').plot();
			}

			return polyline;
	}

	static draw_message_stop_icon_of_foot(rendering_handle, position)
	{
		let other_group = rendering_handle.get_other_group();

		const size = 16;
		const point_end = Message.get_end_side_point(position, [0, 0]);
		let l0 = [
			point_end.x - (size/2), point_end.y - (size/2),
			point_end.x + (size/2), point_end.y + (size/2),
		];
		other_group.line(l0).fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
		let l1 = [
			point_end.x + (size/2), point_end.y - (size/2),
			point_end.x - (size/2), point_end.y + (size/2),
		];
		other_group.line(l1).fill('none').stroke({'color': '#000'}).attr({'stroke-width': 2});
	}
};

