'use strict';

const Version = require('./js/version');

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

	append_doc(doc)
	{
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
			'message_kind':	'create',			// create lifeline
			'text':		'create lifeline',
		},
		{
			'kind':		'message',
			'id':		4,
			'y':		160,
			'start':	{'lifeline_id': 0},	// lifeline to lifeline
			'end':		{'lifeline_id': 1},
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
				'text':		'message of reply',
			},
		},
		{
			'kind':		'message',
			'id':		5,
			'y':		190,
			'start':	{'lifeline_id': 1},	// turnback to lifeline
			'end':		{'lifeline_id': 1},
			'message_kind':	'sync',
			'text':		'turnback',
		},
		{
			'kind':		'message',
			'id':		7,
			'y':		270,
			'start':	{'lifeline_id': 0},
			'end':		{'position_x': 420},				// lost
			'message_kind':	'sync',
			'text':		'message to lost',
		},
		{
			'kind':		'message',
			'id':		8,
			'y':		300,
			'start':	{'lifeline_id': 0},
			'end':		{'position_x': 420},				// lost
			'message_kind':	'stop',						// stop to lifeline
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
		'property': {
			'lifeline_align_axis_y': 30,
		},
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

		if((doc.diagram_historys.length - 2) < doc.on_save_diagram_history_index){
			doc.on_save_diagram_history_index = -1;
		}

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
			if(callback === doc.work.event_listener_history_changes[i]){
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

	static get_filename(doc)
	{
		const filepath = Doc.get_filepath(doc);
		const filename = filepath.replace(/^.*[\\\/]/, '');
		return filename;
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
			'filetype': 'daisy sequence',
			'diagram': diagram,
		};
		const strdata = JSON.stringify(native_doc, null, '\t');
		return strdata;
	}

	static get_plantuml_string(doc, errs_)
	{
		const add_errs_ = function(errs_, level, message)
		{
			const err_ = {
				'level':	level,
				'label':	"PlantUML convert",
				'message':	message,
			};
			errs_.push(err_);
			console.debug(err_);
		};

		if(null === doc){
			add_errs_(errs_, "bug", "doc is empty.");
			return null;
		}

		const src_diagram = Doc.get_diagram(doc);
		const diagram = object_deepcopy(src_diagram);

		let lifelines = [];
		let plantuml_elems = [];

		const func = function(recurse_info, element, opt){

			const func_set_lifeline_ident_name_ = function(element, lifelines)
			{
				let ident_name = element.text;
				ident_name = ident_name.replace(/\n/, "_");
				ident_name = ident_name.replace(/[\[\]\s-,.?<>]/, "_");
				ident_name = ident_name.replace(/[^A-Za-z_]/, "_");
				ident_name = ident_name.replace(/_+/, "_");

				// console.debug(sprintf("n:`%s` `%s`", element.text, ident_name));
				return sprintf("%s_%d", ident_name, element.id);
			};

			switch(element.kind){
				case 'lifeline':
					{
						opt.lifelines.push(element);
						let ident_name = func_set_lifeline_ident_name_(element, lifelines);
						object_make_member(element, 'work.ident_name', ident_name);
						// console.debug(element.work.ident_name);
					}
					break;
				case 'message':
					opt.plantuml_elems.push(element);
					break;
				case 'fragment':
					opt.plantuml_elems.push(element);
					break;
				case 'spec':
				case 'operand':
					// NOP
					break;
				default:
					add_errs_(errs_, "warning", sprintf("invalid element kind: `%s`", element.kind));
			}

			return true;
		};
		let opt = {'lifelines': lifelines, 'plantuml_elems': plantuml_elems, 'ignore_keys':['work'],};
		Element.recursive(diagram.diagram_elements, func, opt);

		plantuml_elems.sort(function(a, b){
			if(a.y < b.y) return -1;
			if(a.y > b.y) return 1;
			return 0;
		});

		const escape_linefeed_ = function(str)
		{
			return str.replace(/\n/, "\\n");
		};

		const func_message_text_ = function(str)
		{
			return str.replace(/\n/, "\\n");
		};
		const func_get_lifeline_ident_name_ = function(element)
		{
			const ident_name = object_get_property_from_path(element, 'work.ident_name');
			return ident_name;
		};
		const func_lifeline_name_ = function(str)
		{
			str = str.replace(/\n/, "\\n");
			return '"' + str + '"';
		};
		const func_operand_text_ = function(str)
		{
			str = str.replace(/^\[/, "");
			return str.replace(/\]$/, "");
		};

		const func_plantuml_message_ = function(strdata, element, diagram, plantuml_opt)
		{
			const message = element;

			const start_lifeline_id = Message.get_start_lifeline_id(message);
			const end_lifeline_id = Message.get_end_lifeline_id(message);
			const start_lifeline = Diagram.get_element_from_id(diagram, start_lifeline_id);
			const end_lifeline = Diagram.get_element_from_id(diagram, end_lifeline_id);
			const start_lifeline_ident_name = ((null !== start_lifeline)? func_get_lifeline_ident_name_(start_lifeline) : "[");
			const end_lifeline_ident_name = ((null !== end_lifeline)? func_get_lifeline_ident_name_(end_lifeline) : "]");

			if(null === start_lifeline && null === end_lifeline){
				// PlantUML start/end nothing lifeline message is nothing?
				add_errs_(errs_, "warning", "not implement. floating message can't defined.");
				return strdata;
			}

			if('create' === message.message_kind){
				strdata += sprintf("create %s\n", end_lifeline_ident_name);
			}

			let arrow = "->";
			switch(message.message_kind){
				case 'reply':
				case 'stop':
					arrow = "-->";
					break;
				case 'async':
					arrow = "->>";
					break;
				default:
					arrow = "->";
			}
			strdata += sprintf("%s%s%s: %s\n",
				start_lifeline_ident_name, arrow, end_lifeline_ident_name,
				func_message_text_(message.text));

			if(null !== end_lifeline){
				switch(message.message_kind){
					case 'sync':
						strdata += sprintf("activate %s\n", end_lifeline_ident_name);
						break;
					case 'reply':
						strdata += sprintf("deactivate %s\n", start_lifeline_ident_name);
						break;
					case 'stop':
						strdata += sprintf("deactivate %s\n", end_lifeline_ident_name);
						break;
					case 'async':
					default:
						// NOP
				}
			}

			if('stop' === message.message_kind){
				strdata += sprintf("destroy %s\n", end_lifeline_ident_name);
			}

			// ** turnback message spec end
			if(null !== end_lifeline && start_lifeline_id === end_lifeline_id){
				const spec_height = ((end_lifeline.hasOwnProperty('spce'))? end_lifeline.spec.height : 30);
				plantuml_opt.plantuml_ex_elems.push({
					'plantuml_ex_elem_kind': "spec_end",
					'y_end': (end_lifeline.y + spec_height),
					'lifeline_ident_name': end_lifeline_ident_name,
				});
			}

			return strdata;
		};

		const func_plantuml_fragment_ = function(strdata, element, diagram, plantuml_opt)
		{
			const func_fragment_text_ = function(str)
			{
				str = "\t" + str;
				str = str.replace(/\n/, "\n\t");
				str = str.replace(/\t$/, "");
				return str;
			};

			const func_get_operand_from_fragment_ = function(fragment)
			{
				let found;

				found = fragment.fragment_kind.match(/\[(.+)\]/);
				if(null !== found){
					return found[1];
				}

				found = fragment.text.match(/\[(.+)\]/);
				if(null !== found){
					return found[1];
				}

				return '';
			};

			const fragment = element;

			let fragment_keyword = '';
			let found = fragment.fragment_kind.toLowerCase().match(/^\s*([a-z]+)/);
			if(null !== found && 2 === found.length){
				fragment_keyword = found[1];
			}

			let is_height = false;
			switch(fragment_keyword){
				case 'loop':
					{
						let ope = func_get_operand_from_fragment_(fragment);
						strdata += sprintf("\n%s %s\n", fragment_keyword, func_fragment_text_(ope));
						is_height = true;
					}
					break;
				case 'opt':
				case 'break':
				case 'critical':
					{
						let ope = func_get_operand_from_fragment_(fragment);
						strdata += sprintf("\n%s %s\n", fragment_keyword, func_fragment_text_(ope));
						is_height = true;

						// optはaltのoperandsを持たない版らしい
						if(fragment.hasOwnProperty('operands') && 0 !== fragment.operands.length){
							add_errs_(errs_, "warning", "opt hasn't operands");
						}
					}
					break;
				case 'ref':
					{
						if(0 === lifelines.length){
							add_errs_(errs_, "warning", "lifeline nothing.");
							break;
						}

						// refは被るLifelineを指定するが、ここでは仮にすべてに被る
						let overs = '';
						for(let i = 0; i < lifelines.length; i++){
							overs += sprintf("%s %s", ((0 === i)? '' : ","), func_get_lifeline_ident_name_(lifelines[i]));
						}

						let ope = func_get_operand_from_fragment_(fragment);
						strdata += sprintf("\n%s over %s\n", fragment_keyword, overs);

						if(fragment.hasOwnProperty('operands')){
							// warning collection
						}

						strdata += sprintf("%s\n", fragment.text);

						strdata += "end ref\n";
					}
					break;
				case 'alt':
				case 'par':
					{
						let ope = func_get_operand_from_fragment_(fragment);
						strdata += sprintf("\n%s %s\n", fragment_keyword, func_fragment_text_(ope));
						is_height = true;

						if(fragment.hasOwnProperty('operands')){
							for(let i = 0; i < fragment.operands.length; i++){
								const operand = fragment.operands[i];
								plantuml_opt.plantuml_ex_elems.push({
									'plantuml_ex_elem_kind': "operand",
									'y': (fragment.y + operand.relate_y),
									'operand': operand,
								});
							}
						}
					}
					break;
				default:
					// note
					// strdata += sprintf("note right\n %s\n end note\n", func_fragment_text_(fragment.text));
					if(0 !== fragment.fragment_kind.length){
						strdata += sprintf("\ngroup %s\n", func_fragment_text_(fragment.fragment_kind));
						is_height = true;
					}else{
						strdata += sprintf("note right\n%s%s\nend note\n",
							(('' !== fragment.fragment_kind)? sprintf("\t%s\n", fragment.fragment_kind): ""),
							func_fragment_text_(fragment.text));
					}
			}

			if(is_height){
				plantuml_opt.plantuml_ex_elems.push({
					'plantuml_ex_elem_kind': "fragment_end",
					'y_end': (fragment.y + fragment.height),
					'fragment': fragment,
					'fragment_keyword': fragment_keyword,
				});
			}

			return strdata;
		};

		// console.debug(lifelines);
		// console.debug(messages);
		let strdata = "";
		strdata += "@startuml\n";
		strdata += sprintf("/' Generator: %s %s '/\n\n", Version.get_name(), Version.get_version());
		for(let i = 0; i < lifelines.length; i++){
			strdata += sprintf("participant %s as %s\n",
				func_lifeline_name_(lifelines[i].text),
				func_get_lifeline_ident_name_(lifelines[i]));
		}
		strdata += "\n";

		let plantuml_opt = {
			'spec_ends':[],
			'plantuml_ex_elems': [],
		};
		for(let i = 0; i < plantuml_elems.length; i++){
			let latest_y = 0;
			switch(plantuml_elems[i].kind){
				case 'message':
				case 'fragment':
				latest_y = plantuml_elems[i].y;
			}

			// ** turnback message spec end
			for(let t = plantuml_opt.spec_ends.length - 1; 0 <= t; t--){
			}
			// ** fragment end(not memo ex.alt, loop...)
			for(let t = plantuml_opt.plantuml_ex_elems.length - 1; 0 <= t; t--){
				switch(plantuml_opt.plantuml_ex_elems[t].plantuml_ex_elem_kind){
					case "spec_end":
						if(plantuml_opt.plantuml_ex_elems[t].y_end < latest_y){
							strdata += "' turnback end\n"
							strdata += sprintf("deactivate %s\n", plantuml_opt.plantuml_ex_elems[t].lifeline_ident_name);
							plantuml_opt.plantuml_ex_elems.splice(t, 1);
						}
						break;
					case "fragment_end":
						if(plantuml_opt.plantuml_ex_elems[t].y_end < latest_y){
							strdata += "end\n";
							strdata += sprintf("' fragment end %s\n\n", plantuml_opt.plantuml_ex_elems[t].fragment.kind);
							plantuml_opt.plantuml_ex_elems.splice(t, 1);
						}
						break;
					case "operand":
						if(plantuml_opt.plantuml_ex_elems[t].y < latest_y){
							const operand_text = func_operand_text_(plantuml_opt.plantuml_ex_elems[t].operand.text);
							strdata += sprintf("else %s\n", operand_text);
							plantuml_opt.plantuml_ex_elems.splice(t, 1);
						}
						break;
				}
			}

			switch(plantuml_elems[i].kind){
				case 'message':
					strdata = func_plantuml_message_(strdata, plantuml_elems[i], diagram, plantuml_opt);
					break;
				case 'fragment':
					strdata = func_plantuml_fragment_(strdata, plantuml_elems[i], diagram, plantuml_opt);
					break;
				default:
			}

		}

		plantuml_opt.plantuml_ex_elems.sort(function(a, b){
			if(a.y_end < b.y_end) return -1;
			if(a.y_end > b.y_end) return 1;
			return 0;
		});
		for(let t = 0; t < plantuml_opt.plantuml_ex_elems.length; t++){
			switch(plantuml_opt.plantuml_ex_elems[t].plantuml_ex_elem_kind){
				case "spec_end":
					{
						strdata += "' turnback end\n"
						strdata += sprintf("deactivate %s\n", plantuml_opt.plantuml_ex_elems[t].lifeline_ident_name);
					}
					break;
				case "fragment_end":
					{
						strdata += "end\n";
						strdata += sprintf("' fragment end %s\n\n", plantuml_opt.plantuml_ex_elems[t].fragment.kind);
					}
					break;
				case "operand":
					{
						const operand_text = func_operand_text_(plantuml_opt.plantuml_ex_elems[t].operand.text);
						strdata += sprintf("else %s\n", operand_text);
					}
					break;
			}
		}

		strdata += "\n@enduml";

		return strdata;
	}

	static on_save(doc)
	{
		doc.on_save_diagram_history_index = doc.diagram_history_index;

		Doc.call_event_listener_on_save_(doc);
	}

	static is_on_save(doc)
	{
		if(-1 === doc.on_save_diagram_history_index){
			return false;
		}

		return (doc.on_save_diagram_history_index === doc.diagram_history_index);
	}

	static add_event_listener_on_save(doc, callback)
	{
		object_make_member(doc, 'work.event_listener_on_saves', []);

		if(doc.work.event_listener_on_saves.includes(callback)){
			return false;
		}

		doc.work.event_listener_on_saves.push(callback);

		return true;
	}

	static call_event_listener_on_save_(doc)
	{
		if(! doc.hasOwnProperty('work')){
			return;
		}
		if(! doc.work.hasOwnProperty('event_listener_on_saves')){
			return;
		}

		for(let i = 0; i < doc.work.event_listener_on_saves.length; i++){
			doc.work.event_listener_on_saves[i](doc);
		}
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

	static append_elements(focus, elements)
	{
		for(let i = 0; i < elements.length; i++){
			Focus.append_element(focus, elements[i]);
		}
	}

	static append_element(focus, element)
	{
		if(null === element){
			return;
		}
		if(focus.elements.includes(element)){
			return;
		}

		focus.elements.push(element);
		if(1 < focus.elements.length){
			focus.focus_state.side = '';
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
			if(callback === focus.work.event_listener_focus_changes[i].callback){
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

	static get_elements_in_range_y(diagram, range_y)
	{
		const func = function(recurse_info, element, opt){
			const rect = Element.get_rect(element);
			if(null === rect){
				return true;
			}

			if(Range.y_is_inside(opt.range_y, rect)){
				opt.elements.push(element);
			}

			return true;
		};
		let opt = {'ignore_keys':['work'], 'elements': [], 'range_y': range_y};
		Element.recursive(diagram.diagram_elements, func, opt);

		return opt.elements;
	}

	static get_elements_in_rect(diagram, rect)
	{
		const func = function(recurse_info, element, opt){
			const rect = Element.get_rect(element);
			if(null === rect){
				return true;
			}

			if(Rect.is_inside(opt.area_rect, rect)){
				opt.elements.push(element);
			}

			return true;
		};
		let opt = {'ignore_keys':['work'], 'elements': [], 'area_rect': rect};
		Element.recursive(diagram.diagram_elements, func, opt);

		return opt.elements;
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
			if(null === rect){
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

	static get_end_side_message_from_kind_and_lifeline_id(diagram, lifeline_id, message_kind)
	{
		for(let i = 0; i < diagram.diagram_elements.length; i++){
			const element = diagram.diagram_elements[i];
			if('message' !== element.kind){
				continue;
			}
			if(! element.end.hasOwnProperty('lifeline_id')){
				continue;
			}
			if(lifeline_id !== element.end.lifeline_id){
				continue;
			}
			if(message_kind === element.message_kind){
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
			'height':		25,
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
			'width':		160,
			'height':		40,
			'is_auto_size':		false,
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
		const func = function(recurse_info, element, opt){
			object_make_member(element, 'work', {});
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
		const source_position = object_get_property_from_path(element, 'work.source_position');
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
		if(! object_has_own_property_path(element, 'work.source_position.x')){
			console.error(element);
			continue;
		}
		 */

		if(0 === elements.length){
			return true;
		}

		const source_position = object_get_property_from_path(elements[0], 'work.source_position');
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
		const source_position = object_get_property_from_path(element, 'work.source_position');
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
		}

		return true;
	}

	static finalize_edit_elements(elements)
	{
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

class Range{
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

function object_make_member(obj, path, value)
{
	const keys = path.split('.');
	let o = obj;
	for(let i = 0; i < keys.length; i++){
		if(undefined === o || null === o || typeof o !== 'object'){
			return false;
		}

		if(! o.hasOwnProperty(keys[i])){
			if(i !== (keys.length - 1)){
				o[keys[i]] = {};
			}else{
				o[keys[i]] = value;
			}
		}

		o = o[keys[i]];
	}

	return true;
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

