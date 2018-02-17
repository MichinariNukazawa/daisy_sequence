'use strict';

class Version{
	static get_name()
	{
		return 'daisy diagram';
	}

	static get_version()
	{
		return '201802.0.0-devel';
	}
}

class DocCollection{
	constructor()
	{
		this.docs = [];
	}

	create_doc()
	{
		this.docs[0] = get_default_doc();
		return 0; // doc_id
	}

	remove_doc(doc_id)
	{
		if(undefined === this.docs[doc_id]){
			console.error("%d", doc_id);
			return;
		}

		if(null === this.docs[doc_id]){
			console.error("%d", doc_id);
			return;
		}

		this.docs[doc_id] = null;
	}

	create_doc_from_native_format_string(strdata, err)
	{
		const doc = Doc.create_from_native_format_string(strdata, err);
		if(null === doc){
			return -1;
		}

		const doc_id = this.assign_doc_id_();
		this.docs[doc_id] = doc;

		return doc_id;
	}

	get_doc_from_id(doc_id)
	{
		if(undefined === this.docs[doc_id]){
			return null;
		}else{
			return this.docs[doc_id];
		}
	}

	get_doc_id_from_doc(doc)
	{
		for(let i = 0; i < this.docs.length; i++){
			if(doc === this.docs[i]){
				return i;
			}
		}

		return -1;
	}

	assign_doc_id_()
	{
		let i = 0;
		while(null !== this.get_doc_from_id(i)){i++;}
		return i;
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
			'kind':		'spec',
			'id':		10,
			'y_offset':	0,
			'height':	300,
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
			'kind':		'spec',
			'id':		11,
			'y_offset':	0,
			'height':	20,
		},
		'reply_message':	{
			'kind':		'message',
			'id':		6,
			'y':		220,
			'message_kind':	'reply',	// reply
			'end_kind':	'none',
			'text':		'message of reply',
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
		'id':		7,
		'y':		270,
		'start':	{'lifeline_id': 0},
		'end':		{'position_x': 420},				// lost
		'end_kind':	'none',
		'message_kind':	'sync',
		'text':		'message to lost',
	},
	{
		'kind':		'message',
		'id':		8,
		'y':		300,
		'start':	{'lifeline_id': 0},
		'end':		{'position_x': 420},				// lost
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
	{
		'kind':			'fragment',
		'id':			12,
		'x':			350,
		'y':			250,
		'width':		120,
		'height':		40,
		'is_auto_size':		true,
		'fragment_kind':	'alt',
		'background_opacity':	'0.1',
		'text':			'text\nmemo fragment',
	},
	{
		'kind':			'fragment',
		'id':			13,
		'x':			350,
		'y':			350,
		'width':		120,
		'height':		40,
		'is_auto_size':		false,
		'fragment_kind':	'',
		'background_opacity':	'0.1',
		'text':			'text\nmemo fragment',
	},
	];

	let diagram = {
		'width': 500,
		'height': 450,
		'diagram_elements': diagram_elements,
	};

	const doc = Doc.create_from_diagram_(diagram);

	return doc;
}

/** doc を操作するstatic methodの集合 */
class Doc{
	static create_from_native_format_string(strdata, err_)
	{
		let native_doc = {};
		try{
			native_doc = JSON.parse(strdata);
		}catch(err){
			console.debug(err.message);
			err_.message = err.message;
			return null;
		}

		if(! native_doc.hasOwnProperty('diagram')){
			err_.message = 'nothing property "diagram"';
			return null;
		}

		const sanitized_diagram = Diagram.sanitize(native_doc.diagram, err_);
		if(null === sanitized_diagram){
			return null;
		}

		const doc = Doc.create_from_diagram_(sanitized_diagram);

		return doc;
	}

	static create_from_diagram_(diagram)
	{
		let focus = {
			'focus_state':{
				'side': '',
				'edge': '',
			},
			'elements': [],
		};

		let diagram_history = {
			'diagram': diagram,
			'focus': focus,
		};

		let doc = {
			'diagram_history_index': 0,
			'diagram_historys': [diagram_history],
			'filepath': '',
			'on_save_diagram_history_index': -1,
		};

		return doc;
	}

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

	static undo(doc)
	{
		if(null === doc){
			console.error("undo error");
			return;
		}

		if(0 < doc.diagram_history_index){
			doc.diagram_history_index--;
		}else{
			console.debug("no undo history: %d %d",
					doc.diagram_history_index,
					doc.diagram_historys.length);
			return;
		}

		if(doc.diagram_history_index < doc.on_save_diagram_history_index){
			doc.on_save_diagram_history_index = -1;
		}

		Doc.call_event_listener_history_change_(doc, 'undo');
	}

	static redo(doc)
	{
		if(null === doc){
			console.error('redo error');
			return;
		}

		if((doc.diagram_history_index + 1) < doc.diagram_historys.length){
			doc.diagram_history_index++;
		}else{
			console.debug("no redo history: %d %d",
					doc.diagram_history_index,
					doc.diagram_historys.length);
			return;
		}

		Doc.call_event_listener_history_change_(doc, 'redo');
	}

	static history_add(doc)
	{
		if(null === doc){
			console.error('');
			return;
		}

		let hist = DiagramHistory.deepcopy(
				doc.diagram_historys[(doc.diagram_history_index)]);
		doc.diagram_historys[doc.diagram_history_index + 1] = hist;
		doc.diagram_history_index++;
		doc.diagram_historys.length = doc.diagram_history_index + 1;

		Doc.call_event_listener_history_change_(doc, 'add');
	}

	static add_event_listener_history_change(doc, callback)
	{
		if(! doc.hasOwnProperty('work')){
			doc.work = {};
		}
		if(! doc.work.hasOwnProperty('event_listener_history_changes')){
			doc.work.event_listener_history_changes = [];
		}

		for(let i = 0; i < doc.work.event_listener_history_changes.length; i++){
			if(callback == doc.work.event_listener_history_changes[i]){
				console.error('duplicated callback');
				return false;
			}
		}

		doc.work.event_listener_history_changes.push(callback);

		return true;
	}

	static call_event_listener_history_change_(doc, event_kind)
	{
		if(! doc.hasOwnProperty('work')){
			return;
		}
		if(! doc.work.hasOwnProperty('event_listener_history_changes')){
			return;
		}

		for(let i = 0; i < doc.work.event_listener_history_changes.length; i++){
			doc.work.event_listener_history_changes[i](doc, event_kind);
		}
	}

	static get_filepath(doc)
	{
		return doc.filepath;
	}

	static set_filepath(doc, filepath)
	{
		doc.filepath = filepath;
	}

	static get_native_format_string(doc)
	{
		if(null === doc){
			return null;
		}

		const src_diagram = Doc.get_diagram(doc);
		let diagram = object_deepcopy(src_diagram);
		object_remove_key(diagram, 'work');
		let native_doc = {
			'diagram': diagram,
			'editor_info': {
				'application_name':	Version.get_name(),
				'version':		Version.get_version(),
			},
		};
		const strdata = JSON.stringify(native_doc, null, '\t');
		return strdata;
	}

	static on_save(doc)
	{
		doc.on_save_diagram_history_index = doc.diagram_history_index;
	}

	static is_on_save(doc)
	{
		if(-1 === doc.on_save_diagram_history_index){
			return false;
		}

		return (doc.on_save_diagram_history_index === doc.diagram_history_index);
	}
};

class DiagramHistory{
	static deepcopy(src_history){
		// ** copy diagram document tree
		const diagram = object_deepcopy(src_history.diagram);

		// ** copy focus
		//! @notice focus.* is direct copy excluded focus.elements because this is reference
		let focus = {};
		focus.work = src_history.focus.work;
		focus.focus_state = object_deepcopy(src_history.focus.focus_state);

		focus.elements = [];
		for(let i = 0; i < src_history.focus.elements.length; i++){
			const src_element = src_history.focus.elements[i];

			const element = Diagram.get_element_from_id(diagram, src_element.id);
			if(null === element){
				console.error(src_element);
			}else{
				focus.elements.push(element);
			}
		}

		let dst_history = {
			'diagram': diagram,
			'focus': focus,
		};

		return dst_history;
	}
};

class Focus{
	static set_element(focus, element)
	{
		focus.elements.length = 0;
		if(null !== element){
			focus.elements.push(element);
		}

		Focus.call_event_listener_focus_change_(focus);
	}

	static clear(focus)
	{
		focus.elements.length = 0;
	}

	static set_side(focus, side){
		focus.focus_state.side = side;
	}

	static is_focusing(focus)
	{
		return (0 !== focus.elements.length);
	}

	static get_elements(focus)
	{
		return focus.elements;
	}

	static get_focus_state(focus)
	{
		return focus.focus_state;
	}

	static add_event_listener_focus_change(focus, callback, user_data)
	{
		if(! focus.hasOwnProperty('work')){
			focus.work = {};
		}
		if(! focus.work.hasOwnProperty('event_listener_focus_changes')){
			focus.work.event_listener_focus_changes = [];
		}

		for(let i = 0; i < focus.work.event_listener_focus_changes.length; i++){
			if(callback == focus.work.event_listener_focus_changes[i].callback){
				console.error('duplicated callback');
				return false;
			}
		}

		let cb = {'callback': callback, 'user_data': user_data};
		focus.work.event_listener_focus_changes.push(cb);

		return true;
	}

	static call_event_listener_focus_change_(focus)
	{
		if(! focus.hasOwnProperty('work')){
			return;
		}
		if(! focus.work.hasOwnProperty('event_listener_focus_changes')){
			return;
		}

		for(let i = 0; i < focus.work.event_listener_focus_changes.length; i++){
			focus.work.event_listener_focus_changes[i].callback(
					focus,
					focus.work.event_listener_focus_changes[i].user_data);
		}
	}
};

class Diagram{
	static create_element(diagram, kind, data)
	{
		let element = null;
		if('lifeline' === kind){
			element = Diagram.create_lifeline_(data);
		}else if('message' === kind){
			element = Diagram.create_message_(data);
		}else if('spec' === kind){
			element = Diagram.create_spec_(data);
		}else if('reply_message' === kind){
			element = Diagram.create_reply_message_(data);
		}else if('fragment' === kind){
			element = Diagram.create_fragment_(data);
		}else{
			return null;
		}

		element.id = Diagram.create_id_(diagram);
		return element;
	}

	static create_append_element(diagram, kind, data)
	{
		let element = Diagram.create_element(diagram, kind, data);
		if(! Diagram.append_element_(diagram, element)){
			return null;
		}else{
			return element;
		}
	}

	static delete_elements(diagram, elements)
	{
		for(let i = 0; i < elements.length; i++){
			Diagram.delete_element_from_id_(diagram, elements[i].id);
		}
	}

	static delete_element_from_id_(diagram, id)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			let element = diagram.diagram_elements[i];
			if(id === element.id){
				diagram.diagram_elements.splice(i, 1);
				return true;
			}

			if('message' !== element.kind){
				continue;
			}
			if(element.hasOwnProperty('spec') && null !== element.spec){
				if(id === element.spec.id){
					element.spec = null;
					return true;
				}
			}
			if(element.hasOwnProperty('reply_message') && null !== element.reply_message){
				if(id === element.reply_message.id){
					element.reply_message = null;
					return true;
				}
			}
		}

		return false;
	}

	static sanitize(src_diagram, err_)
	{
		//! @todo not implement
		return object_deepcopy(src_diagram);
	}

	static get_size(diagram)
	{
		return {
			'width':	diagram.width,
			'height':	diagram.height,
		};
	}

	static MAX_SIZE()
	{
		return 30000;
	}

	static MIN_SIZE()
	{
		return 150;
	}

	static set_size(diagram, size)
	{
		if(! Number.isFinite(size.width)
				|| Diagram.MIN_SIZE() > size.width
				|| Diagram.MAX_SIZE() < size.width){
			return false;
		}
		if(! Number.isFinite(size.height)
				|| Diagram.MIN_SIZE() > size.height
				|| Diagram.MAX_SIZE() < size.height){
			return false;
		}
		diagram.width = Math.round(size.width);
		diagram.height = Math.round(size.height);

		return true;
	}

	static get_element_from_id(diagram, id)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if(id === element.id){
				return element;
			}
		}

		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];

			if('message' !== element.kind){
				continue;
			}
			if(element.hasOwnProperty('spec') && null !== element.spec){
				if(id === element.spec.id){
					return element.spec;
				}
			}
			if(element.hasOwnProperty('reply_message') && null !== element.reply_message){
				if(id === element.reply_message.id){
					return element.reply_message;
				}
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
		}

		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];

			if('message' !== element.kind){
				continue;
			}
			if(element.hasOwnProperty('spec') && null !== element.spec){
				if(Diagram.is_touch_element_by_work_rect_(element.spec, point)){
					return element.spec;
				}
			}
			if(element.hasOwnProperty('reply_message') && null !== element.reply_message){
				if(Diagram.is_touch_element_by_work_rect_(element.reply_message, point)){
					return element.reply_message;
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

		if(Rect.is_touch(collision_rect, point, offset)){
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

	static get_x_axis_touch_lifeline(diagram, point_x, sensitive_x)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if('lifeline' !== element.kind){
				continue;
			}
			if(sensitive_x > Math.abs(element.x - point_x)){
				return element;
			}
		}

		return null;
	}

	static append_element_(diagram, element)
	{
		diagram.diagram_elements.push(element);

		return true;
	}

	static get_end_side_message_from_lifeline_id(diagram, lifeline_id, end_kind)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if('message' != element.kind){
				continue;
			}
			if(! element.end.hasOwnProperty('lifeline_id')){
				continue;
			}
			if(lifeline_id != element.end.lifeline_id){
				continue;
			}
			if(end_kind == element.end_kind){
				return element;
			}
		}

		return null;
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

			if('message' !== element.kind){
				continue;
			}
			if(element.hasOwnProperty('spec') && null !== element.spec){
				if(id < element.spec.id){
					id = element.spec.id;
				}
			}
			if(element.hasOwnProperty('reply_message') && null !== element.reply_message){
				if(id < element.reply_message.id){
					id = element.reply_message.id;
				}
			}
		}

		return id;
	}

	static create_lifeline_(src)
	{
		// default lifeline
		let lifeline = {
			'kind': 'lifeline',
			'id': -1,
			'x': 100,
			'y': 30,
			'text': 'Lifeline -'
		};

		lifeline = Object.assign(lifeline, src);

		return lifeline;
	}

	static create_message_(src)
	{
		let message = {
			'kind':		'message',
			'id':		-1,
			'y':		10,
			'start':	{'position_x': 0},
			'end':		{'position_x': 10},
			'end_kind':	'none',
			'message_kind':	'sync',
			'text':		'message',
		};

		message = Object.assign(message, src);

		return message;
	}

	static create_reply_message_(src)
	{
		let reply_message = {
			'kind':			'message',
			'id':			-1,
			'y':			220,
			'message_kind':		'reply',	// reply
			'end_kind':		'none',
			'text':			'message of reply',
		};

		reply_message = Object.assign(reply_message, src);

		return reply_message;
	}

	static create_spec_(src)
	{
		let spec = {
			'kind':			'spec',
			'id':			-1,
			'y_offset':		0,
			'height':		20,
		};

		spec = Object.assign(spec, src);

		return spec;
	}

	static create_fragment_(src)
	{
		let spec = {
			'kind':			'fragment',
			'id':			-1,
			'x':			350,
			'y':			350,
			'width':		60,
			'height':		40,
			'is_auto_size':		true,
			'fragment_kind':	'',
			'background_opacity':	0.1,
			'text':			'',
		};

		spec = Object.assign(spec, src);

		return spec;
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

	static get_lr_side_of_touch(element, point)
	{
		let rect = Element.get_rect(element);
		if(null === rect){
			return '';
		}

		rect = Rect.abs(rect);
		const offset = [4, 4];
		{
			let side_rect = Object.assign({}, rect);
			side_rect.width = 32;
			side_rect = Rect.expand(side_rect, offset);
			if(Rect.is_touch(side_rect, point, [0, 0])){
				return 'left';
			}
		}
		{
			let side_rect = Object.assign({}, rect);
			side_rect.x = side_rect.x + side_rect.width - 32;
			side_rect.width = 32;
			side_rect = Rect.expand(side_rect, offset);
			if(Rect.is_touch(side_rect, point, [0, 0])){
				return 'right';
			}
		}

		return '';
	}

	static get_edge_of_touch(element, point)
	{
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
};

class Message{

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

	static get_start_side_point(position, offset)
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

	static get_end_side_point(position, offset)
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
};

class Fragment{
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
};

class Rect{
	static expand(src_rect, offset)
	{
		let rect = Object.assign({}, src_rect);
		rect.x -= offset[0];
		rect.y -= offset[1];
		rect.width += (offset[0] * 2);
		rect.height += (offset[1] * 2);

		return rect;
	}

	static abs(src_rect)
	{
		let rect = Object.assign({}, src_rect);
		if(rect.width < 0){
			rect.x = src_rect.x + src_rect.width;
			rect.width = src_rect.width * -1;
		}
		if(rect.height < 0){
			rect.y = src_rect.y + src_rect.height;
			rect.height = src_rect.height * -1;
		}

		return rect;
	}

	static expand(src_rect, padding)
	{
		let rect = Object.assign({}, src_rect);
		rect.x		-= padding[0];
		rect.y		-= padding[1];
		rect.width	+= (padding[0] * 2);
		rect.height	+= (padding[1] * 2);

		return rect;
	}

	static add_size(src_rect, offset)
	{
		let rect = Object.assign({}, src_rect);
		rect.width	+= offset[0];
		rect.height	+= offset[1];

		return rect;
	}

	static is_touch(rect, point, offset)
	{
		let collision_rect = Object.assign({}, rect);
		collision_rect = Rect.abs(collision_rect);
		collision_rect = Rect.expand(collision_rect, offset);

		if(collision_rect.x < point.x
				&& point.x < (collision_rect.x + collision_rect.width)
				&& collision_rect.y < point.y
				&& point.y < (collision_rect.y + collision_rect.height)){
			return true;
		}

		return false;
	}
};

/**** ############### ****/

function move_element(current_diagram, element, move)
{
	if('lifeline' == element.kind){
		element.x += move.x;
		element.y += move.y;
	}else if('message' == element.kind){
		element.y += move.y;
	}else if('spec' == element.kind){
		element.height += move.y;
	}else if('fragment' == element.kind){
		element.x += move.x;
		element.y += move.y;
	}
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

function object_remove_key(obj, keys)
{
	if(obj instanceof Array){
		obj.forEach(function(item){
			object_remove_key(item,keys)
		});
	}
	else if(typeof obj === 'object'){
		Object.getOwnPropertyNames(obj).forEach(function(key){
			if(keys.indexOf(key) !== -1)delete obj[key];
			else object_remove_key(obj[key],keys);
		});
	}
}

