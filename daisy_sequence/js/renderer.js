'use strict';

const sprintf = require('sprintf-js').sprintf;
const ObjectUtil = require('./object-util');
//const {Element, Message, Rect, Spec, Point} = require('./element');
const Diagram = require('./diagram');

module.exports.RenderingHandle = class RenderingHandle{
	constructor(elemId)
	{
		this.draw = null;
		this.groups = [];

		this.draw = SVG(elemId).size(0, 0);
		this.clear();

		this.resource = RenderingHandle.generate_resource();
	}

	static generate_resource()
	{
		let resource = {};

		try{
			const fs = require("fs");
			const path = require('path');
			const filepath = path.join(__dirname, '../image/edge.svg');
			resource.edge_icon_svg = fs.readFileSync(filepath, 'utf8');
		}catch(err){
			console.error(err);
		}

		return resource;
	}

	get_draw()
	{
		return this.draw;
	}

	get_other_group()
	{
		return this.groups.other_group;
	}

	get_root_group()
	{
		return this.groups.root_group;
	}

	get_background_group()
	{
		return this.groups.background_group;
	}

	get_lifeline_group()
	{
		return this.groups.lifeline_group;
	}

	get_spec_group()
	{
		return this.groups.spec_group;
	}

	get_fragment_group()
	{
		return this.groups.fragment_group;
	}

	get_divider_group()
	{
		return this.groups.divider_group;
	}

	get_editor_group()
	{
		return this.groups.editor_group;
	}

	get_focus_group()
	{
		return this.groups.focus_group;
	}

	clear()
	{
		this.draw.clear();
		this.groups.root_group			= this.draw.group().addClass('dd__root-group');
		this.groups.background_group		= this.get_root_group().group().addClass('dd__background-group');
		this.groups.lifeline_group		= this.get_root_group().group().addClass('dd__lifeline-group');
		this.groups.spec_group			= this.get_root_group().group().addClass('dd__spec-group');
		this.groups.other_group			= this.get_root_group().group().addClass('dd__other-group');
		this.groups.fragment_group		= this.get_root_group().group().addClass('dd__fragment-group');
		this.groups.divider_group		= this.get_root_group().group().addClass('dd__divider-group');

		this.groups.editor_group		= this.get_root_group().group().addClass('dd__editor-group');
		this.groups.focus_group			= this.get_editor_group().group().addClass('dd__focus-group');
	}
};

module.exports.Renderer = class Renderer{
	static rerendering(rendering_handle, diagram, focus, mouse_state, tool_kind)
	{
		rendering_handle.clear();

		if(null !== diagram){
			Renderer.rendering_diagram_(rendering_handle, diagram, focus, mouse_state, tool_kind);
		}
	}

	static rendering_diagram_(rendering_handle, diagram, focus, mouse_state, tool_kind)
	{
		Renderer.rendering_(rendering_handle, diagram);

		Renderer.draw_focus_(rendering_handle, focus);

		Renderer.draw_mouse_state_(rendering_handle, mouse_state);

		Renderer.draw_tool_(rendering_handle, diagram, mouse_state, tool_kind);

		// ** frame
		{
			let background_group = rendering_handle.get_background_group();
			if(null === background_group){
				console.error('');
				return;
			}

			const margin = 2;
			let rect = {
				'x': margin,
				'y': margin,
				'width': diagram.width - (margin * 2),
				'height': diagram.height - (margin * 2),
			};
			background_group.rect(rect.width, rect.height)
				.move(rect.x, rect.y)
				.attr({
				'stroke':		'#ddd',
				'fill-opacity':		'0',
				'stroke-width':		'2',
			});
		}
	}

	static draw_mouse_state_(rendering_handle, mouse_state)
	{
		const {Rect} = require('./element');

		// ** mouse_state mode
		switch(mouse_state.mode){
			case 'focus_by_rect':
				{
					let focus_group = rendering_handle.get_focus_group();

					let drug_rect = MouseState.get_drug_rect(mouse_state);
					drug_rect = Rect.abs(drug_rect);

					focus_group.rect(drug_rect.width, drug_rect.height)
					.move(drug_rect.x, drug_rect.y)
					.attr({
						'stroke':		'#4cf',
						'fill-opacity':		'0',
						'stroke-width':		'1.2',
					});
				}
				break;
			default:
				break;
		}
	}

	static draw_tool_(rendering_handle, diagram, mouse_state, tool_kind)
	{
		let focus_group = rendering_handle.get_focus_group();

		switch(mouse_state.mode){
			case 'none':
				return;
		}

		switch(tool_kind){
			case 'height-arrow':
				{
					const rect = {
						'x': -10,
						'y': mouse_state.point.y,
						'width': diagram.width + 10,
						'height': 200,
					};
					let gradient = rendering_handle.get_draw().gradient('linear', function(stop) {
						stop.at({offset:0, color:'#4cf', opacity:0.4})
						stop.at({offset:1, color:'#4cf', opacity:0})
					});
					gradient.from(0,0).to(0,1); // top to bottom
					let rect_ = focus_group.rect(rect.width, rect.height)
					.move(rect.x, rect.y)
					.attr({
						'fill':		gradient,
					});
					rect_.fill(gradient);
				}
				break;
			default:
				break;
		}
	}

	static rendering_(rendering_handle, diagram)
	{
		let other_group = rendering_handle.get_other_group();

		if(null === diagram){
			console.debug('Rendering:diagram is null');
			return;
		}

		let draw = rendering_handle.get_draw();
		draw.size(diagram.width, diagram.height);

		{
			let messages = [];
			for(let i = 0; i < diagram.diagram_elements.length; i++){
				if('message' === diagram.diagram_elements[i].kind){
					let message = diagram.diagram_elements[i];
					messages.push(message);
					if(ObjectUtil.get_property_from_path(message, 'work.sequence_number')){
						delete message.work.sequence_number;
					}
					// @todo 上記コード、これでは効かないのだけれどどういうこと？
					//ObjectUtil.makeMember(message, 'work.sequence_number', {});

				}
			}
			const sequence_number_kind = ObjectUtil.get_property_from_path(diagram, 'property.sequence_number_kind');
			if(! sequence_number_kind){
				// NOP
			}else if('None' === sequence_number_kind || 'Nothing' === sequence_number_kind){
				// NOP
			}else if('Simple' === sequence_number_kind){
				// sequence_number の情報を生成
				messages.sort(function(a, b){
					const ay = a.y;
					const by = b.y;
					return ay - by;
				});
				for(let i = 0; i < messages.length; i++){
					ObjectUtil.makeMember(messages[i], 'work.sequence_number.str', sprintf("%03d: ", i + 1));
				}
			}else{
				console.warn('invalid property.sequenc_number_kind:', sequence_number_kind);
			}
		}

		for(let i = 0; i < diagram.diagram_elements.length; i++){
			if('lifeline' === diagram.diagram_elements[i].kind){
				Renderer.draw_lifeline(rendering_handle, diagram, diagram.diagram_elements[i]);
			}else if('message' === diagram.diagram_elements[i].kind){
				// Renderer.draw_message(rendering_handle, diagram, diagram.diagram_elements[i], null);
			}else if('fragment' === diagram.diagram_elements[i].kind){
				Renderer.draw_fragment(rendering_handle, diagram.diagram_elements[i]);
			}else if('divider' === diagram.diagram_elements[i].kind){
				Renderer.draw_divider(rendering_handle, diagram, diagram.diagram_elements[i]);
			}else{
				console.error(i, diagram.diagram_elements[i]);
				const msg = sprintf("internal error: invalid element kind `%s`(%d,%d)",
					diagram.diagram_elements[i].kind,
					diagram.diagram_elements[i].id,
					i
				);
				alert(msg);
			}
		}

		Renderer.process_spec_(rendering_handle, diagram);
	}

	static process_spec_(rendering_handle, diagram)
	{
		const {Message, Spec} = require('./element');

		let specs = [];
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if('message' !== element.kind){
				continue;
			}

			let position = Message.get_position(element, diagram);
			if(element.hasOwnProperty('spec') && null !== element.spec){
				position.height = Spec.get_height(element.spec, element);
			}else{
				position.height = 0;
			}

			specs.push({'message': element, 'position': position, 'start_rank': 0, 'end_rank': 0,});
		}

		specs.sort(function(a, b){
			return a.position.y - b.position.y;
		});

		let rank_obj = {};
		for(let i = 0; i < specs.length; i++){
			const message = specs[i].message;
			const start_lifeline_id = Message.get_start_lifeline_id(message);
			if(undefined === rank_obj[start_lifeline_id]){
				rank_obj[start_lifeline_id] = [];
			}
			const end_lifeline_id = Message.get_end_lifeline_id(message);
			if(undefined === rank_obj[end_lifeline_id]){
				rank_obj[end_lifeline_id] = [];
			}

			const ob = specs[i];
			for(let t = rank_obj[start_lifeline_id].length - 1; 0 <= t; t--){
				const ob_ = rank_obj[start_lifeline_id][t];
				const y = ob_.position.y + ob_.position.height;
				if(y < ob.position.y){
					rank_obj[start_lifeline_id].pop();
				}else{
					break;
				}
			}
			for(let t = rank_obj[end_lifeline_id].length - 1; 0 <= t; t--){
				const ob_ = rank_obj[end_lifeline_id][t];
				const y = ob_.position.y + ob_.position.height;
				if(y < ob.position.y){
					rank_obj[end_lifeline_id].pop();
				}else{
					break;
				}
			}
			ob.start_rank = rank_obj[start_lifeline_id].length;
			if(-1 === start_lifeline_id){
				ob.start_rank = 0;
			}
			ob.end_rank = rank_obj[end_lifeline_id].length;
			if(-1 === end_lifeline_id){
				ob.end_rank = 0;
			}
			rank_obj[end_lifeline_id].push(ob);
			/* console.log("%d lifeline:%d rank:%d %d %d",
			   ob.message.spec.id, end_lifeline_id, rank_obj[end_lifeline_id].length,
			   ob.position.y, ob.position.height);
			 */
		}

		// console.log(rank_obj);

		for(let i = 0; i < specs.length; i++){
			let message = specs[i].message;
			if(message.hasOwnProperty('spec') && null !== message.spec){
				Renderer.draw_spec(
					rendering_handle,
					diagram,
					message,
					specs[i].end_rank
				);
			}
			Renderer.draw_message(
				rendering_handle,
				diagram,
				message,
				null,
				specs[i].start_rank,
				specs[i].end_rank
			);
		}
	}

	static draw_focus_(rendering_handle, focus)
	{
		const {Element, Rect} = require('./element');

		let focus_group = rendering_handle.get_focus_group();

		// focusing
		const elements = Focus.get_elements(focus);
		for(let i = 0; i < elements.length; i++){
			let rect = Rect.abs(Element.get_rect(elements[i]));
			if(null === rect){
				alert('internal error. (rect is null)');
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

		if(null !== ObjectUtil.get_property_from_path(diagram, 'property.lifeline_align_axis_y')){
			lifeline.y = diagram.property.lifeline_align_axis_y;
		}

		let message_of_create = Diagram.get_end_side_message_from_kind_and_lifeline_id(diagram, lifeline.id, 'create');
		if(null !== message_of_create){
			lifeline.y = message_of_create.y - (24 + 5);
		}

		// 空の名前を表示しようとすると、lifelineの表示が消えて位置計算もおかしくなるので、対処する
		const show_name = (! /^\s*$/.test(lifeline.text))? lifeline.text : '-';
		let text = lifeline_group.text(show_name).move(lifeline.x, lifeline.y).font({
			'fill': '#000' ,
			'size': '24px',
		});

		const attr = {
			'stroke':		'#70C0C0',
			'fill-opacity':		'0',
			'stroke-width':		'3',
		};
		const padding = 7;
		const radius = 3;
		const offset = [12, 10];

		let b = text.bbox();
		let box = {
			'x': b.x - padding,
			'y': b.y - padding,
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
		let stop_message = Diagram.get_end_side_message_from_kind_and_lifeline_id(diagram, lifeline.id, 'stop');

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
		let line = lifeline_group.line(
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

	static draw_message(rendering_handle, diagram, message, parent_message, start_rank, end_rank)
	{
		const {Message, Spec, Rect} = require('./element');

		let other_group = rendering_handle.get_other_group();

		if('reply' === message.message_kind){
			message.start = ObjectUtil.deepcopy(parent_message.end);
			message.end = ObjectUtil.deepcopy(parent_message.start);
			delete message.start.position_x;
			delete message.end.position_x;
		}

		let position = Message.get_position(message, diagram);
		// console.log("%d %d %d", position.width, start_rank, end_rank);
		const start_offset_x = start_rank * Spec.WIDTH();
		position.x += start_offset_x;
		position.width += (end_rank * Spec.WIDTH()) - start_offset_x;

		if(! message.hasOwnProperty('work')){
			message.work = {};
		}
		{
			let rect = Object.assign({}, position);
			rect.y -= 8;
			rect.height = 24;

			const sign_weight = ((0 <= rect.width)? 1 : -2);
			rect.x += 4 * sign_weight;
			rect.width -= 8 * sign_weight;
			if(8 > Math.abs(rect.width)){
				rect.x -= 4 * sign_weight;
				rect.width = 8 * sign_weight;
			}

			message.work.rect = rect;
		}

		let is_turnback = false;
		if(message.start.hasOwnProperty('lifeline_id')
			&& message.end.hasOwnProperty('lifeline_id')
			&& message.start.lifeline_id === message.end.lifeline_id
			&& 0 <= message.start.lifeline_id){
			const is_spec = (message.hasOwnProperty('spec') && null !== message.spec);
			let svg_elem = Renderer.draw_message_turnback(rendering_handle, position, is_spec);
			is_turnback = true;
			let b = svg_elem.bbox();
			message.work.rect = Object.assign({}, b);
		}else{
			let line = other_group.line(
				position.x,
				position.y,
				position.x + position.width,
				position.y + position.height)
				.stroke({
					'width': '2',
				});

			if('reply' === message.message_kind){
				line.attr({
					'stroke-dasharray':	'10',
				});
			}

			if('stop' !== message.message_kind){
				Renderer.draw_message_array_of_foot(rendering_handle, position, message.message_kind);
			}else{
				Renderer.draw_message_stop_icon_of_foot(rendering_handle, position);
			}

			let is_found = (! (message.start.hasOwnProperty('lifeline_id') && 0 <= message.start.lifeline_id));
			let is_lost = (! (message.end.hasOwnProperty('lifeline_id') && 0 <= message.end.lifeline_id));

			if(is_found){
				const size = 16;
				const point_head = Message.get_start_side_point_from_position(position, [(size/2), 0]);
				other_group.circle(size).move(point_head.x - (size/2), point_head.y - (size/2));
			}
			if(is_lost){
				const size = 16;
				const point_end = Message.get_end_side_point_from_position(position, [(size/2), 0]);
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
		let message_text = message.text;
		if(ObjectUtil.get_property_from_path(message, 'work.sequence_number.str')){
			message_text = message.work.sequence_number.str + message_text;
		}
		let text = other_group.text(message_text).move(text_point.x, text_point.y);

		let is_touch_start_side_lifeline
			= (message.start.hasOwnProperty('lifeline_id') && 0 <= message.start.lifeline_id);
		let is_touch_end_side_lifeline
			= (message.end.hasOwnProperty('lifeline_id') && 0 <= message.end.lifeline_id);
		if(is_touch_end_side_lifeline){
			if(message.hasOwnProperty('spec') && null !== message.spec){
				if(is_touch_end_side_lifeline && is_touch_start_side_lifeline){
					if(message.hasOwnProperty('reply_message') && null !== message.reply_message){
						Renderer.draw_message(rendering_handle, diagram, message.reply_message, message, end_rank, start_rank - 1);
					}
				}
			}
		}
	}

	static draw_spec(rendering_handle, diagram, message, rank)
	{
		const {Message, Spec, Rect} = require('./element');

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

		message.spec.height = Spec.get_height(message.spec, message);

		const end_side_point = Message.get_end_side_point(message, diagram);
		let box = {
			'x':		end_side_point.x - 1 + (rank * Spec.WIDTH()),
			'y':		end_side_point.y + spec.y_offset,
			'width':	Spec.WIDTH(),
			'height':	message.spec.height,
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
		const {Rect} = require('./element');

		let fragment_group = rendering_handle.get_fragment_group();
		let bg_group = fragment_group.group().addClass('dd__fragment-bg');
		let fg_group = fragment_group.group().addClass('dd__fragment-fg');

		const position = Rect.abs(fragment);

		const padding = [5, 0];
		// ** fragment_kind
		let fragment_kind_size = [0, 0];
		if('' !== fragment.fragment_kind){
			let fragment_kind_text = null;
			fragment_kind_text = fg_group.text(fragment.fragment_kind).move(position.x, position.y);
			const b = fragment_kind_text.bbox();
			fragment_kind_size = [
				b.width,
				b.height,
			];

			// *** fragment_kind frame
			let points = [
				b.x - padding[0],	b.y + b.height,
				b.x + b.width + 1,		b.y + b.height,
				b.x + b.width + 7,	b.y + b.height - 5,
				b.x + b.width + 7,	b.y - 1,
			];
			let fragment_kind_polyline = fg_group.polyline(points)
				.stroke({ width: 1, linecap: 'round', }).fill('none');
		}

		// ** text
		let text_rect = {
			'x': position.x,
			'y': position.y,
			'width': fragment_kind_size[0],
			'height': fragment_kind_size[1],
		};
		if(! /^\s*$/.test(fragment.text)){
			let text = null;
			text = fg_group.text(fragment.text)
				.move(position.x, fragment_kind_size[1] + position.y);
			const b = text.bbox();

			text_rect.width = Math.max(b.width, fragment_kind_size[0]);
			text_rect.height = b.height + fragment_kind_size[1];
		}

		// ** auto size
		if(fragment.is_auto_size){
			fragment.width = text_rect.width;
			fragment.height = text_rect.height;
		}

		// ** get rect
		let box = Rect.expand(Rect.abs(Rect.deepcopy(fragment)), padding);
		box = Rect.expand(box, [2, 2]);
		box.width += 6;

		// ** frame
		const attr = {
			'stroke':		'#000',
			'stroke-width':		'1',
			'fill-opacity':		fragment.background_opacity,
			'fill': '#1080FF',
		};
		const radius = 1;
		let background_rect = bg_group.rect(box.width, box.height).move(box.x, box.y)
			.radius(radius).attr(attr);

		// ** frame resize icon
		if(! fragment.is_auto_size){
			let group_edge_icon = fg_group.group().addClass('fragment__edge-icon');
			if(! rendering_handle.resource.edge_icon_svg){
				console.error("nothing rendering_handle.resource.edge_icon_svg");
			}else{
				group_edge_icon.svg(rendering_handle.resource.edge_icon_svg)
					.move(box.x + box.width - 16 - 8, box.y + box.height - 16 - 8).scale(0.5, 0.5).attr({
						'opacity':	0.3,
					});
			}
		}

		// ** operands
		if(fragment.hasOwnProperty('operands') && null !== fragment.operands){
			for(let i = 0; i < fragment.operands.length; i++){
				Renderer.draw_operand(rendering_handle, fragment.operands[i], fragment, box);
			}
		}

		// ** work.rect
		if(! fragment.hasOwnProperty('work')){
			fragment.work = {};
		}
		fragment.work.rect = Object.assign({}, box);

		return fragment_group;
	}

	static draw_divider(rendering_handle, diagram, divider)
	{
		const {Rect} = require('./element');

		let divider_group = rendering_handle.get_divider_group();
		let item_group = divider_group.group().addClass('dd__divider-item');

		const text_point = {
			'x': divider.x,
			'y': divider.y + 0,
		}
		
		const show_text = (! /^\s*$/.test(divider.text))? divider.text : '-';
		let text = item_group.text(show_text).move(text_point.x, text_point.y).font({
			'fill': '#000' ,
			'size': '24px',
		});

		let height = 24;
		let position = {
			'x': 0,
			'y': divider.y,
			'width': diagram.width,
			'height': height,
		};

		for(let i = 0; i < 2; i++){
			const y = position.y + (4 * i);
			let line0 = item_group.line(
				position.x, y,
				position.width, y,
			)
				.stroke({
					'width': '1.5',
				})
				.attr({
					'opacity':	0.4,
				});
		}

		// ** work.rect
		if(! divider.hasOwnProperty('work')){
			divider.work = {};
		}
		divider.work.rect = Object.assign({}, position);
	}

	static draw_operand(rendering_handle, operand, fragment, fragment_position)
	{
		let fragment_group = rendering_handle.get_fragment_group();

		// console.log("operand:%d %d %s", operand.id, operand.relate_y, operand.text);

		let position = {
			'x': fragment_position.x,
			'y': fragment_position.y + operand.relate_y,
			'width': fragment_position.width,
			'height': 16,
		};

		let line = fragment_group.line(
			position.x,
			position.y,
			position.x + position.width,
			position.y + 0
		)
			.stroke({
				'width': '1.2',
			})
			.attr({
				'stroke-opacity':	'0.6',
				'stroke-dasharray':	'5',
			});

		if(! /^\s*$/.test(operand.text)){
			let text = fragment_group.text(operand.text)
				.move(position.x + 5, position.y + 1);
		}

		// ** work.rect
		if(! operand.hasOwnProperty('work')){
			operand.work = {};
		}
		operand.work.rect = Object.assign({}, position);
	}

	static draw_message_turnback(rendering_handle, position, is_spec)
	{
		const {Message, Spec, Rect} = require('./element');

		let other_group = rendering_handle.get_other_group();

		const height = 10;
		const end_point = {
			'x': position.x + 0 + ((is_spec)? Spec.WIDTH():0), 'y': position.y + height,
		};

		const points = [
			position.x, position.y,
			position.x + 100, position.y + 0,
			position.x + 100, position.y + height,
			end_point.x, end_point.y,
		];
		let polyline = other_group.polyline(points).stroke({ width: 2, }).fill('none');

		let array_polyline = Renderer.draw_array_top(rendering_handle, end_point, [6, 6], true);

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

		let polyline = Renderer.draw_array_top(rendering_handle, point, offset, ('sync' === message_kind));
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
		const {Message, Spec, Rect} = require('./element');

		let other_group = rendering_handle.get_other_group();

		const size = 16;
		const point_end = Message.get_end_side_point_from_position(position, [0, 0]);
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

