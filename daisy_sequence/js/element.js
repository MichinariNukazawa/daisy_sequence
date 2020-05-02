'use strict';

const ObjectUtil = require('./object-util');

module.exports.Element = class Element{
	static get_rect(element)
	{
		if(! element.hasOwnProperty('work')){
			return null;
		}
		if(! element.work.hasOwnProperty('rect')){
			return null;
		}

		return element.work.rect;
	}

	static get_lr_side_of_touch(element, point)
	{
		const {Rect} = require('./element');

		let rect = Element.get_rect(element);
		if(null === rect){
			return '';
		}

		rect = Rect.abs(rect);
		const offset = [4, 4];
		{
			let side_rect = Object.assign({}, rect);
			side_rect.x = side_rect.x + side_rect.width - 32;
			side_rect.width = 32;
			side_rect = Rect.expand(side_rect, offset);
			if(Rect.is_touch(side_rect, point, [0, 0])){
				return 'right';
			}
		}
		{
			let side_rect = Object.assign({}, rect);
			side_rect.width = 32;
			side_rect = Rect.expand(side_rect, offset);
			if(Rect.is_touch(side_rect, point, [0, 0])){
				return 'left';
			}
		}

		return '';
	}

	static get_edge_of_touch(element, point)
	{
		const {Rect} = require('./element');

		let rect = Element.get_rect(element);
		if(null === rect){
			return '';
		}

		rect = Rect.abs(rect);
		{
			let edge_rect = {
				'x':		rect.x + rect.width - 32,
				'y':		rect.y + rect.height - 32,
				'width':	32,
				'height':	32,
			}
			if(Rect.is_touch(edge_rect, point, [0, 0])){
				return 'right-bottom';
			}
		}

		return '';
	}

	static get_child_elements(obj)
	{
		const func = function(recurse_info, element, opt){
			opt.elements.push(element);
			return true;
		};
		let opt = {'elements': [], 'ignore_keys':['work'],};
		Element.recursive(obj, func, opt);

		return opt.elements;
	}

	static recursive_preservation_source_position(elements)
	{
		const {Rect} = require('./element');

		const func = function(recurse_info, element, opt){
			ObjectUtil.make_member(element, 'work', {});
			const position = Rect.deepcopy(element);
			if(element.hasOwnProperty('relate_y')){
				position.relate_y = element.relate_y;
			}
			element.work['source_position'] = position;

			return true;
		}

		const opt = {'ignore_keys':['work'],};
		Element.recursive(elements, func, opt);
	}

	static resize_element_by_source_position(element, move){
		const source_position = ObjectUtil.get_property_from_path(element, 'work.source_position');
		if(undefined === source_position || null === source_position){
			console.error(elements);
			return false;
		}

		element.width = source_position.width + move.x;
		element.height = source_position.height + move.y;
		return true;
	}

	static move_elements_by_source_position(elements, move)
	{
		/*
		if(! ObjectUtil.has_own_property_path(element, 'work.source_position.x')){
			console.error(element);
			continue;
		}
		 */

		if(0 === elements.length){
			return true;
		}

		const source_position = ObjectUtil.get_property_from_path(elements[0], 'work.source_position');
		if(undefined === source_position || null === source_position){
			console.error(elements);
			return false;
		}

		if(1 === elements.length && 'operand' === elements[0].kind){
			elements[0].relate_y = source_position.relate_y + move.y;
			if(0 > elements[0].relate_y){
				elements[0].relate_y = 0;
			}
			return true;
		}

		if(1 === elements.length && 'spec' === elements[0].kind){
			Element.move_element_by_source_position_(elements[0], move);
			return true;
		}

		for(let i = 0; i < elements.length; i++){
			if('spec' === elements[i].kind){
				// NOP
			}else if('operand' === elements[i].kind){
				// NOP
			}else{
				Element.move_element_by_source_position_(elements[i], move);
			}
		}

		return true;
	}

	static move_element_by_source_position_(element, move)
	{
		const source_position = ObjectUtil.get_property_from_path(element, 'work.source_position');
		if(null === source_position){
			console.error(element);
			return false;
		}

		if('lifeline' === element.kind){
			element.x = source_position.x + move.x;
			element.y = source_position.y + move.y;
		}else if('message' === element.kind){
			element.y = source_position.y + move.y;
		}else if('spec' === element.kind){
			element.height = source_position.height + move.y;
		}else if('fragment' === element.kind){
			element.x = source_position.x + move.x;
			element.y = source_position.y + move.y;
		}else if('divider' === element.kind){
			element.x = source_position.x + move.x;
			element.y = source_position.y + move.y;
		}

		return true;
	}

	static finalize_edit_elements(elements)
	{
		const {Rect} = require('./element');

		for(let i = 0; i < elements.length; i++){
			let element = elements[i];
			Rect.abs_ref(element);
		}
	}

	static recursive(obj, func, func_opt)
	{
		return this.recursive_(true, obj, func, func_opt);
	}

	static recursive_top_reverse(obj, func, func_opt)
	{
		return this.recursive_(false, obj, func, func_opt);
	}

	static recursive_(is_top_order, obj, func, func_opt)
	{
		let recurse_info = {
			'level': 0,
			'count': 0,
			'last_element': null,
			'parent_objs': [],
			'get_parent_id': function(){
				for(let i = this.level - 1; 0 <= i; i--){
					let obj = this.parent_objs[i];
					if(undefined === obj){
						continue;
					}
					if(null === obj){
						continue;
					}
					if(obj.hasOwnProperty('kind')){// is element
						return obj.id;
					}
				}
				return -1;
			},
		};

		if(! is_top_order && Array.isArray(obj)){
			for(let i = obj.length - 1; 0 <= i; i--){
				let res = Element.recursive_inline_(recurse_info, obj[i], func, func_opt);
				if("boolean" !== typeof res){
					console.error("bug", res);
					return false;
				}
				if(false === res){
					return false;
				}
			}
		}else{
			return Element.recursive_inline_(recurse_info, obj, func, func_opt);
		}
	}

	static debug_recursive(recurse_info, element, opt){
		const parent_id = recurse_info.get_parent_id();
		console.log("id:%d level:%d count:%d parent:%d",
			element.id,
			recurse_info.level,
			recurse_info.count,
			parent_id);

		return true;
	}

	static recursive_inline_(recurse_info, obj, func, opt)
	{
		if(undefined === obj){
			return true;
		}
		if(null === obj){
			return true;
		}

		if(obj.hasOwnProperty('kind')){// is element
			// Element.debug_recursive(recurse_info, obj, opt);
			recurse_info.count++;
			let res = func(recurse_info, obj, opt);
			recurse_info.last_element = obj;

			if(! res){
				return false;
			}
		}

		// ** recurse children
		recurse_info.parent_objs[recurse_info.level] = obj;
		recurse_info.level++;
		for(let key in obj){
			if(typeof obj[key] !== 'object' && typeof obj[key] !== 'array'){
				continue;
			}
			if(opt.hasOwnProperty['ignore_keys'] && opt.ignore_keys.includes(key)){
				continue;
			}
			if(! Element.recursive_inline_(recurse_info, obj[key], func, opt)){
				return false;
			}
		}
		recurse_info.level--;

		return true;
	}
};

module.exports.Message = class Message{

	/*! @return is_edited */
	static change_side_from_point(message, diagram, message_side, point)
	{
		// console.log(message_side);

		if('start' === message_side){
			message.start.position_x = point.x;

			const lifeline = Diagram.get_x_axis_touch_lifeline(diagram, point.x, 32);
			if(null === lifeline){
				message.start.lifeline_id = -1;
			}else{
				message.start.lifeline_id = lifeline.id;
			}

			return true;
		}else if('end' === message_side){
			message.end.position_x = point.x;

			const lifeline = Diagram.get_x_axis_touch_lifeline(diagram, point.x, 32);
			if(null === lifeline){
				message.end.lifeline_id = -1;
			}else{
				message.end.lifeline_id = lifeline.id;
			}

			return true;
		}else{
			return false;
		}
	}

	static get_message_side_from_element_side(element, side)
	{
		const {Element} = require('./element');

		if('message' !== element.kind){
			console.error(element);
			return '';
		}

		const rect = Element.get_rect(element);
		if(null === rect){
			return '';
		}

		if('left' === side){
			side = 'start';
		}else if('right' === side){
			side = 'end';
		}else{
			return '';
		}

		if(0 > rect.width){
			if('start' === side){
				return 'end'
			}else{
				return 'start'
			}
		}

		return side;
	}

	static get_start_side_point_from_position(position, offset)
	{
		let point;
		if(0 < position.width){
			point = {'x': position.x, 'y': position.y};
			point.x += offset[0];
			point.y += offset[1];
		}else{
			point = {'x': position.x, 'y': position.y};
			point.x -= offset[0];
			point.y -= offset[1];
		}

		return point;
	}

	static get_end_side_point_from_position(position, offset)
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

	static get_end_side_point(message, diagram)
	{
		const parent_message_position = Message.get_position(message, diagram);
		const end_side_point = Message.get_end_side_point_from_position(parent_message_position, [0,0]);
		return end_side_point;
	}

	static get_position(message, diagram)
	{
		const Diagram = require('./diagram');

		let position = {
			'x': 0,
			'y': 0,
			'width': 0,
			'height': 0,
		};

		if(message.start.hasOwnProperty('lifeline_id') && 0 <= message.start.lifeline_id){

			let lifeline = Diagram.get_element_from_id(diagram, message.start.lifeline_id);
			if(null === lifeline || 'lifeline' !== lifeline.kind){
				console.error(message.start);
				// alert('bug');
				return position;
			}
			position.x = lifeline.x;
		}else if(message.start.hasOwnProperty('position_x')){
			position.x = message.start.position_x;
		}else{
			console.error(message.start);
			alert('bug');
			return position;
		}

		position.y = message.y;

		if(message.end.hasOwnProperty('lifeline_id') && 0 <= message.end.lifeline_id){

			let lifeline = Diagram.get_element_from_id(diagram, message.end.lifeline_id);
			if(null === lifeline || 'lifeline' !== lifeline.kind){
				console.error(message.end);
				// alert('bug');
				return position;
			}
			position.width = lifeline.x - position.x;
		}else if(message.end.hasOwnProperty('position_x')){
			position.width = message.end.position_x - position.x;
		}else{
			console.error(message.start);
			alert('bug');
			return position;
		}

		return position;
	}

	static get_start_lifeline_id(message)
	{
		if(! message.hasOwnProperty('start')){
			return -1;
		}
		if(! message.start.hasOwnProperty('lifeline_id')){
			return -1;
		}
		if(0 <= message.start.lifeline_id){
			return message.start.lifeline_id;
		}

		return -1;
	}

	static get_end_lifeline_id(message)
	{
		if(! message.hasOwnProperty('end')){
			return -1;
		}
		if(! message.end.hasOwnProperty('lifeline_id')){
			return -1;
		}
		if(0 <= message.end.lifeline_id){
			return message.end.lifeline_id;
		}

		return -1;
	}
};

module.exports.Spec = class Spec{
	static WIDTH()
	{
		return 5;
	}

	static get_height(spec, message)
	{
		let height = spec.height;
		if(message.hasOwnProperty('reply_message') && null !== message.reply_message){
			height = message.reply_message.y - message.y;
		}

		return height;
	}
};

module.exports.Fragment = class Fragment{
	static get_infos()
	{
		const infos = [
			{id: 0, name:'(comment)'},
			// {id: 1, name:'alt'},
			{id: 2, name:'loop'},
			{id: 3, name:'break'},
		];

		return infos;
	}

	static add_create_operand(fragment, diagram, data)
	{
		const Diagram = require('./diagram');

		let operand = Diagram.create_element(diagram, 'operand', {});
		if(! fragment.hasOwnProperty('operands')){
			fragment.operands = [];
		}
		fragment.operands.push(operand);

		operand.relate_y = fragment.height;
		fragment.height += 30;
		fragment.is_auto_size = false;
	}
};

module.exports.Rect = class Rect{
	static expand(src_rect, offset)
	{
		if(null === src_rect){
			return null;
		}

		let rect = Object.assign({}, src_rect);
		rect.x -= offset[0];
		rect.y -= offset[1];
		rect.width += (offset[0] * 2);
		rect.height += (offset[1] * 2);

		return rect;
	}

	static abs(src_rect)
	{
		const {Rect} = require('./element');

		if(null === src_rect){
			return null;
		}

		let rect = Object.assign({}, src_rect);
		return Rect.abs_ref(rect);
	}

	static abs_ref(rect)
	{
		if(null === rect){
			return null;
		}

		if(rect.hasOwnProperty('x') && rect.hasOwnProperty('width') && rect.width < 0){
			rect.x = rect.x + rect.width;
			rect.width = rect.width * -1;
		}
		if(rect.hasOwnProperty('y') && rect.hasOwnProperty('height') && rect.height < 0){
			rect.y = rect.y + rect.height;
			rect.height = rect.height * -1;
		}

		return rect;
	}

	static expand(src_rect, padding)
	{
		if(null === src_rect){
			return null;
		}

		let rect = Object.assign({}, src_rect);
		rect.x		-= padding[0];
		rect.y		-= padding[1];
		rect.width	+= (padding[0] * 2);
		rect.height	+= (padding[1] * 2);

		return rect;
	}

	static add_size(src_rect, offset)
	{
		if(null === src_rect){
			return null;
		}

		let rect = Object.assign({}, src_rect);
		rect.width	+= offset[0];
		rect.height	+= offset[1];

		return rect;
	}

	static is_touch(rect, point, offset)
	{
		const {Rect} = require('./element');

		let collision_rect = Object.assign({}, rect);
		collision_rect = Rect.abs(collision_rect);
		collision_rect = Rect.expand(collision_rect, offset);

		if(point.x < collision_rect.x || (collision_rect.x + collision_rect.width) < point.x){
			return false;
		}
		if(point.y < collision_rect.y || (collision_rect.y + collision_rect.height) < point.y){
			return false;
		}

		return true;
	}

	static is_inside(rect_area_, rect_target_)
	{
		const {Rect} = require('./element');

		const rect_area = Rect.abs(rect_area_);
		const rect = Rect.abs(rect_target_);
		const points = [
			{'x':rect.x, 'y':rect.y,},
			{'x':rect.x + rect.width, 'y':rect.y,},
			{'x':rect.x, 'y':rect.y + rect.height,},
			{'x':rect.x + rect.width, 'y':rect.y + rect.heihgt,},
		];
		for(let i = 0; i < points.length; i++){
			if(! Rect.is_touch(rect_area, points[i], [0, 0])){
				//if(rect_area.width > 300)
				//	console.log(i, rect_area, rect);
				return false;
			}
		}

		console.log(rect_area, rect);
		return true;
	}

	static deepcopy(src_rect)
	{
		if(null === src_rect){
			return null;
		}

		let dst = {};
		if(src_rect.hasOwnProperty('x')){
			dst.x = src_rect.x;
		}
		if(src_rect.hasOwnProperty('y')){
			dst.y = src_rect.y;
		}
		if(src_rect.hasOwnProperty('width')){
			dst.width = src_rect.width;
		}
		if(src_rect.hasOwnProperty('height')){
			dst.height = src_rect.height;
		}

		return dst;
	}
};

module.exports.Range = class Range{
	static y_is_inside(area_range_y_, target_range_y_)
	{
		const area_range_y = Range.y_abs(area_range_y_);
		const target_range_y = Range.y_abs(target_range_y_);

		if(target_range_y.y < area_range_y.y){
			return false;
		}

		if(! target_range_y.hasOwnProperty('height')){
			target_range_y.height = 0;
		}

		if((area_range_y.y + area_range_y.height) < (target_range_y.y + target_range_y.height)){
			return false;
		}

		return true;
	}

	static y_abs(src_range)
	{
		let range = {};
		if(! src_range.hasOwnProperty('y')){
			return null;
		}

		range.y = src_range.y;

		if(src_range.hasOwnProperty('height')){
			range.height = src_range.height;
			if(range.height < 0){
				range.y = range.y + range.height;
				range.height = range.height * -1;
			}
		}

		return range;
	}

};

module.exports.Point = class Point{
	static sub(point0, point1)
	{
		return {
			'x': point0.x - point1.x,
			'y': point0.y - point1.y,
		};
	}
};

