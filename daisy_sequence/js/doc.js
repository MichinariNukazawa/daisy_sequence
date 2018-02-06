'use strict';

class DocCollection{
	constructor()
	{
		this.docs = [];
		this.docs[0] = get_default_doc();
	}

	create_doc()
	{
		return 0; // doc_id
	}

	get_doc_from_id(doc_id)
	{
		if(undefined === this.docs[doc_id]){
			return null;
		}else{
			return this.docs[doc_id];
		}
	}
};

function get_default_doc()
{
	let diagram_elements = [
	{
		'kind': 'lifeline',
		'id': 0,
		'x': 150,
		'y': 30,
		'text': 'Object1'
	},
	{
		'kind': 'lifeline',
		'id': 1,
		'x': 300,
		'y': 30,
		'text': 'Object2'
	},
	{
		'kind':		'message',
		'id':		2,
		'y':		70,
		'start':	{'position_x': 20},		// from found
		'end':		{'lifeline_id': 0},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'message\nfrom found',
		'spec':		{
			'kind': 'spec',
			'y_offset': 0,
			'end':{'height': 300},
		},
	},
	{
		'kind':		'message',
		'id':		3,
		'y':		110,
		'start':	{'lifeline_id': 0},
		'end':		{'lifeline_id': 1},
		'end_kind':	'create',			// create lifeline
		'message_kind':	'async',
		'text':		'create lifeline',
	},
	{
		'kind':		'message',
		'id':		4,
		'y':		160,
		'start':	{'lifeline_id': 0},	// lifeline to lifeline
		'end':		{'lifeline_id': 1},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'lifeline to lifeline',
		'spec':		{
			'kind': 'spec',
			'y_offset': 0,
			'end':{'reply': null},
		},
	},
	{
		'kind':		'message',
		'id':		5,
		'y':		190,
		'start':	{'lifeline_id': 1},	// turnback to lifeline
		'end':		{'lifeline_id': 1},
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'turnback',
	},
	{
		'kind':		'message',
		'id':		6,
		'y':		220,
		'start':	{'lifeline_id': 1},
		'end':		{'lifeline_id': 0},
		'end_kind':	'none',
		'message_kind':	'reply',	// reply
		'text':		'message of reply',
	},
	{
		'kind':		'message',
		'id':		7,
		'y':		270,
		'start':	{'lifeline_id': 0},
		'end':		{'position_x': 280},				// lost
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'message to lost',
	},
	{
		'kind':		'message',
		'id':		8,
		'y':		300,
		'start':	{'lifeline_id': 0},
		'end':		{'position_x': 280},				// lost
		'end_kind':	'none',
		'message_kind':	'async',					// async
		'text':		'message async to lost',
	},
	{
		'kind':		'message',
		'id':		9,
		'y':		350,
		'start':	{'lifeline_id': 0},
		'end':		{'lifeline_id': 1},
		'end_kind':	'stop',						// stop to lifeline
		'message_kind':	'sync',
		'text':		'stop to lifeline',
	},
	];

	let diagram = {
		'width': 500,
		'height': 450,
		'diagram_elements': diagram_elements,
	};

	let focus = {
		'elements': [],
	};

	let diagram_history = {
		'diagram': diagram,
		'focus': focus,
	};

	let doc = {
		'diagram_history_index': 0,
		'diagram_historys': [diagram_history],
	};

	return doc;
}

/** doc を操作するstatic methodの集合 */
class Doc{
	static get_diagram(doc)
	{
		if(null === doc){
			console.error('');
			return null;
		}

		return doc.diagram_historys[doc.diagram_history_index].diagram;
	}

	static get_focus(doc)
	{
		if(null === doc){
			console.error('');
			return null;
		}

		return doc.diagram_historys[doc.diagram_history_index].focus;
	}

	static undo(current_doc)
	{
		if(null === current_doc){
			console.error("undo error");
			return;
		}

		if(0 < current_doc.diagram_history_index){
			current_doc.diagram_history_index--;
		}else{
			console.debug("no undo history: %d %d",
					current_doc.diagram_history_index,
					current_doc.diagram_historys.length);
		}
	}

	static redo(current_doc)
	{
		if(null === current_doc){
			console.error('redo error');
			return;
		}

		if((current_doc.diagram_history_index + 1) < current_doc.diagram_historys.length){
			current_doc.diagram_history_index++;
		}else{
			console.debug("no redo history: %d %d",
					current_doc.diagram_history_index,
					current_doc.diagram_historys.length);
		}
	}

	static history_add(current_doc)
	{
		if(null === current_doc){
			console.error();
			return;
		}

		let hist = DiagramHistory.deepcopy(
				current_doc.diagram_historys[(current_doc.diagram_history_index)]);
		current_doc.diagram_historys[current_doc.diagram_history_index + 1] = hist;
		current_doc.diagram_history_index++;
		current_doc.diagram_historys.length = current_doc.diagram_history_index + 1;
	}

	static history_add_cancel(current_doc)
	{
		if(null === current_doc){
			console.error();
			return;
		}

		current_doc.diagram_history_index--;
		current_doc.diagram_historys.length = current_doc.diagram_history_index + 1;
	}
};

class DiagramHistory{
	static deepcopy(src_history){
		const diagram = object_deepcopy(src_history.diagram);
		let focus = {'elements': []};

		for(let i = 0; i < src_history.focus.elements.length; i++){
			const element = src_history.focus.elements[i];
			const ix = src_history.diagram.diagram_elements.findIndex(x => x === element);
			if(ix < 0 || diagram.diagram_elements.length <= ix){
				console.error(ix);
			}else{
				focus.elements.push(diagram.diagram_elements[ix]);
			}
		}

		let dst_history = {
			'diagram': diagram,
			'focus': focus,
		};

		return dst_history;
	}
}

class Focus{
	static set_element(focus, element)
	{
		focus.elements.length = 0;
		if(null !== element){
			focus.elements.push(element);
		}
	}

	static is_focusing(focus)
	{
		return (0 !== focus.elements.length);
	}

	static get_elements(focus)
	{
		return focus.elements;
	}
};

class Diagram{
	static create_element(diagram, kind, data)
	{
		let element = null;
		if('lifeline' == kind){
			element = Diagram.create_lifeline_(data);
		}else{
			return null;
		}

		element.id = Diagram.create_id_(diagram);
		return element;
	}

	static get_element_from_id(diagram, id)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if(id == element.id){
				return element;
			}
		}

		return null;
	}

	static get_element_of_touch(diagram, point)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];

			if(Diagram.is_touch_element_by_work_rect_(element, point)){
				return element;
			}

			if('message' == element.kind){
				if(! element.hasOwnProperty('spec')){
					continue;
				}
				if(Diagram.is_touch_element_by_work_rect_(element.spec, point)){
					return element.spec;
				}
			}
		}

		return null;
	}

	static is_touch_element_by_work_rect_(element, point)
	{
		let rect = Element.get_rect(element);
		if(null == rect){
			return false;
		}

		let collision_rect = Object.assign({}, rect);

		let offset = [0, 0];
		if('spec' == element.kind){
			offset = [16, 16];
		}

		if(rect_is_touch(collision_rect, point, offset)){
			return true;
		}

		return false;
	}

	static get_lifeline_from_name(diagram, lifeline_name)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if('lifeline' !== element.kind){
				continue;
			}
			if(lifeline_name === element.text){
				return element;
			}
		}

		return null;
	}

	static add_element(diagram, element)
	{
		diagram.diagram_elements.push(element);

		return true;
	}

	static create_id_(diagram)
	{
		let id = Diagram.get_max_id_(diagram);
		return (id + 1);
	}

	static get_max_id_(diagram)
	{
		let id = -1;
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if(id < element.id){
				id = element.id;
			}
		}

		return id;
	}

	static create_lifeline_(src)
	{
		// default lifeline
		let lifeline = {
			'kind': 'lifeline',
			'id': 0,
			'x': 100,
			'y': 30,
			'text': 'Lifeline -'
		};

		lifeline = Object.assign(lifeline, src);

		return lifeline;
	}
};

class Element{
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
};

/**** ############### ****/

function rect_expand(src_rect, offset)
{
	let rect = Object.assign({}, src_rect);
	rect.x -= offset[0];
	rect.y -= offset[1];
	rect.width += (offset[0] * 2);
	rect.height += (offset[1] * 2);

	return rect;
}

function rect_abs(src_rect)
{
	let rect = Object.assign({}, src_rect);
	if(rect.width < 0){
		rect.x = src_rect.x - src_rect.width;
		rect.width = src_rect.width * -1;
	}
	if(rect.height < 0){
		rect.y = src_rect.y - src_rect.height;
		rect.height = src_rect.height * -1;
	}

	return rect;
}

function rect_is_touch(rect, point, offset)
{
	let collision_rect = Object.assign({}, rect);
	collision_rect = rect_abs(collision_rect);
	collision_rect = rect_expand(collision_rect, offset);

	if(collision_rect.x < point.x
			&& point.x < (collision_rect.x + collision_rect.width)
			&& collision_rect.y < point.y
			&& point.y < (collision_rect.y + collision_rect.height)){
		return true;
	}

	return false;
}

function move_element(current_diagram, element, move)
{
	if('lifeline' == element.kind){
		element.x += move.x;
		element.y += move.y;
	}else if('message' == element.kind){
		element.y += move.y;
	}else if('spec' == element.kind){
		if(element.hasOwnProperty('end') && element.end.hasOwnProperty('height')){
			element.end.height += move.y;
		}
	}
}

function get_message_of_timeline_create(current_diagram, timeline_name)
{
	for(let i = 0; i < current_diagram.diagram_elements.length; i++){
		let element = current_diagram.diagram_elements[i];
		if('message' != element.kind){
			continue;
		}
		if(! element.end.hasOwnProperty('lifeline')){
			continue;
		}
		if(timeline_name != element.end.lifeline){
			continue;
		}
		if('create' == element.end_kind){
			return element;
		}
	}

	return null;
}

function get_message_of_timeline_end(current_diagram, timeline_name)
{
	for(let i = 0; i < current_diagram.diagram_elements.length; i++){
		let element = current_diagram.diagram_elements[i];
		if('message' != element.kind){
			continue;
		}
		if(! element.end.hasOwnProperty('lifeline')){
			continue;
		}
		if(timeline_name != element.end.lifeline){
			continue;
		}
		if('stop' == element.end_kind){
			return element;
		}
	}

	return null;
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

function object_deepcopy(obj)
{
	/*
	   let r = {};
	   for(let name in obj){
	   if(typeof obj[name] === 'object'){
	   r[name] = this.deep_clone_(obj[name]);
	   }else{
	   r[name] = obj[name];
	   }
	   }
	   return r;
	 */

	return JSON.parse(JSON.stringify(obj))
}

