'use strict';

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
		'y': 20,
		'text': 'Object1'
	},
	{
		'kind': 'lifeline',
		'id': 1,
		'x': 300,
		'y': 20,
		'text': 'Object2'
	},
	{
		'kind':		'message',
		'id':		2,
		'y':		90,
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
			console.debug(err);
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
		if(typeof filepath !== 'string'){
			console.error(filepath); // BUG
			filepath = '';
		}

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
			'editor_info': {
				'application_name':	Version.get_name(),
				'version':		Version.get_version(),
			},
			'diagram': diagram,
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

	static preservation_element_source_position(focus)
	{
		for(let i = 0; i < focus.elements.length; i++){
			let element = focus.elements[i];
			object_make_member(element, 'work');
			const position = Rect.deepcopy(element);
			element.work['source_position'] = position;
		}
	}

	static move_by_source_position(focus, move)
	{
		/*
		if(! object_has_own_property_path(element, 'work.source_position.x')){
			console.error(element);
			continue;
		}
		*/

		let elements = focus.elements;

		const source_position = object_get_property_from_path(elements[0], 'work.source_position');
		if(null === source_position){
			console.error(element);
			return false;
		}

		let is_move = true;
		if(1 === elements.length && 'fragment' === elements[0].kind){
			if('right-bottom' === focus.focus_state.edge){
				elements[0].width = source_position.width + move.x;
				elements[0].height = source_position.height + move.y;
				is_move = false;
			}
		}

		if(1 === elements.length && 'operand' === elements[0].kind){
			elements[0].relate_y = source_position.relate_y + move.y;
			if(0 > elements[0].relate_y){
				elements[0].relate_y = 0;
			}
			is_move = false;
		}

		if(is_move){
			for(let i = 0; i < elements.length; i++){
				Focus.move_element_(elements[i], move);
			}
		}

		return true;
	}

	static move_element_(element, move)
	{
		const source_position = object_get_property_from_path(element, 'work.source_position');
		if(null === source_position){
			console.error(element);
			return false;
		}

		if('lifeline' == element.kind){
			element.x = source_position.x + move.x;
			element.y = source_position.y + move.y;
		}else if('message' == element.kind){
			element.y = source_position.y + move.y;
		}else if('spec' == element.kind){
			element.height = source_position.height + move.y;
		}else if('fragment' == element.kind){
			element.x = source_position.x + move.x;
			element.y = source_position.y + move.y;
		}

		return true;
	}

	static finalize_edit(focus)
	{
		for(let i = 0; i < focus.elements.length; i++){
			let element = focus.elements[i];
			Rect.abs_ref(element);
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
		}else if('operand' === kind){
			element = Diagram.create_operand_(data);
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

	static get_parent_element_from_id(diagram, id)
	{
		let func = function(recurse_info, element, opt){
			if(opt.id === element.id){
				opt.parent_element = recurse_info.get_parent_element();
				return false;
			}
			return true;
		};
		let opt = {'id': id, 'parent_element': null, 'ignore_keys':['work'],};
		Element.recursive(diagram.diagram_elements, func, opt);

		return opt.parent_element;
	}

	static pre_delete_element_(diagram, id)
	{
		const func = function(recurse_info, element, opt){
			if('message' === element.kind){
				let is = false;
				if(element.hasOwnProperty('start')){
					if(element.start.hasOwnProperty('lifeline_id')){
						if(opt.id === element.start.lifeline_id){
							is = true;
						}
					}
				}
				if(is){
					const lifeline = Diagram.get_element_from_id(opt.diagram, opt.id);
					element.start.position_x = lifeline.x;
					delete element.start.lifeline_id;
				}
				is = false;
				if(element.hasOwnProperty('end')){
					if(element.end.hasOwnProperty('lifeline_id')){
						if(opt.id === element.end.lifeline_id){
							is = true;
						}
					}
				}
				if(is){
					const lifeline = Diagram.get_element_from_id(opt.diagram, opt.id);
					element.end.position_x = lifeline.x;
					delete element.end.lifeline_id;
				}
			}
			return true;
		};
		let opt = {'id': id, 'diagram': diagram, 'ignore_keys':['work'],};
		Element.recursive(diagram.diagram_elements, func, opt);

		return;
	}

	static delete_element_from_id_(diagram, id)
	{
		let func = function(recurse_info, element, opt){
			if(opt.id === element.id){
				// console.debug(recurse_info);
				opt.parent_obj = recurse_info.parent_objs[recurse_info.level - 1];
				return false;
			}
			return true;
		};
		let opt = {'id': id, 'parent_obj': null, 'ignore_keys':['work'],};
		Element.recursive(diagram.diagram_elements, func, opt);

		if(null === opt.parent_obj){
			console.error(id, opt.parent_obj);
			return;
		}

		Diagram.pre_delete_element_(diagram, id);

		let obj = opt.parent_obj;
		if(Array.isArray(obj)){
			for(let i = 0; i < obj.length; i++){
				if(obj[i].hasOwnProperty('id') && obj[i].id === id){
					obj.splice(i, 1);
					return true;
				}
			}
		}else if(typeof obj === 'object'){
			for(let key in obj){
				if(obj[key].hasOwnProperty('id') && obj[key].id === id){
					delete obj[key];
					return true;
				}
			}
		}else{
			console.error(id, opt.parent_obj);
			return false;
		}

		return false;
	}

	static reorder_from_element_id(diagram, element_id, reorder_kind)
	{
		let elements = diagram.diagram_elements;
		if(1 >= elements.length){
			return false;
		}
		for(let i = 0; i < elements.length; i++){
			if(element_id === elements[i].id){
				const e = elements[i];
				elements.splice(i, 1);
				if('Top' === reorder_kind){
					elements.splice((elements.length - 1), 0, e);
				}else if('End' === reorder_kind){
					elements.splice(0, 0, e);
				}else if('Raise' === reorder_kind){
					const max = (elements.length - 1);
					const ix = ((max < (i + 1))? max : (i + 1));
					elements.splice(ix, 0, e);
				}else if('Lower' === reorder_kind){
					const min = 0;
					const ix = ((min > (i - 1))? min : (i - 1));
					elements.splice(ix, 0, e);
				}else{
					console.error(reorder_kind);
					return false;
				}

				return true;
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
		let func = function(recurse_info, element, opt){
			if(opt.id === element.id){
				opt.element = element;
				return false;
			}
			return true;
		};
		let opt = {'id': id, 'element': null, 'ignore_keys':['work'],};
		Element.recursive(diagram.diagram_elements, func, opt);

		return opt.element;
	}

	static get_element_of_touch(diagram, point)
	{
		const func = function(recurse_info, element, opt)
		{
			if(opt.exclude_kinds.includes(element.kind)){
				return true;
			}

			let rect = Element.get_rect(element);
			if(null == rect){
				return true;
			}

			let collision_rect = Object.assign({}, rect);

			let offset = [4, 4];
			if(Rect.is_touch(collision_rect, opt.point, offset)){
				opt.element = element;
				return false;
			}

			return true;
		};

		let opt = {'point': point, 'element': null, 'ignore_keys':['work'],};
		opt.exclude_kinds = ['operand', 'fragment'];
		Element.recursive_top_reverse(diagram.diagram_elements, func, opt);
		if(null !== opt.element){
			return opt.element;
		}

		opt.exclude_kinds = ['fragment'];
		Element.recursive_top_reverse(diagram.diagram_elements, func, opt);
		if(null !== opt.element){
			return opt.element;
		}

		opt.exclude_kinds = [];
		Element.recursive_top_reverse(diagram.diagram_elements, func, opt);
		if(null !== opt.element){
			return opt.element;
		}

		return opt.element;
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
			if(! element.hasOwnProperty('kind')){
				console.error(element);
				continue;
			}
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
		let func = function(recurse_info, element, opt){
			if(opt.id < element.id){
				opt.id = element.id;
			}
			return true;
		};
		let opt = {'id': -1, 'ignore_keys':['work'],};
		Element.recursive(diagram.diagram_elements, func, opt);

		return opt.id;
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

	static create_operand_(src)
	{
		let operand = {
			"kind": "operand",
			"id": -1,
			"relate_y":10,
			"text": "[]"
		};

		operand = Object.assign(operand, src);

		return operand;
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
		let position = {
			'x': 0,
			'y': 0,
			'width': 0,
			'height': 0,
		};

		if(message.start.hasOwnProperty('lifeline_id') && 0 <= message.start.lifeline_id){

			let lifeline = Diagram.get_element_from_id(diagram, message.start.lifeline_id);
			if(null === lifeline || 'lifeline' != lifeline.kind){
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
			if(null == lifeline || 'lifeline' != lifeline.kind){
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

		if(message.start.hasOwnProperty('lifeline_id') && 0 <= message.start.lifeline_id){
			return message.start.lifeline_id;
		}

		return -1;
	}

	static get_end_lifeline_id(message)
	{

		if(message.end.hasOwnProperty('lifeline_id') && 0 <= message.end.lifeline_id){
			return message.end.lifeline_id;
		}

		return -1;
	}
};

class Spec{
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

	static add_create_operand(fragment, diagram, data)
	{
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
		return Rect.abs_ref(rect);
	}

	static abs_ref(rect)
	{
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

	static deepcopy(src)
	{
		let dst = {};
		if(src.hasOwnProperty('x')){
			dst.x = src.x;
		}
		if(src.hasOwnProperty('y')){
			dst.y = src.y;
		}
		if(src.hasOwnProperty('width')){
			dst.width = src.width;
		}
		if(src.hasOwnProperty('height')){
			dst.height = src.height;
		}

		return dst;
	}
};

class Point{
	static sub(point0, point1)
	{
		return {
			'x': point0.x - point1.x,
			'y': point0.y - point1.y,
		};
	}
};

/**** ############### ****/


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

function object_make_member(obj, key)
{
	if(! obj.hasOwnProperty(key)){
		obj[key] = {};
	}
}

function object_get_property_from_path(obj, path)
{
	const keys = path.split('.');
	let o = obj;
	for(let i = 0; i < keys.length; i++){
		if(undefined === o || null === o || typeof o !== 'object'){
			return null;
		}
		if(! o.hasOwnProperty(keys[i])){
			return null;
		}else{
			o = o[keys[i]];
		}
	}

	return o;
}

