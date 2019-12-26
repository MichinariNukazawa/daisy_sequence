'use strict';

const sprintf = require('sprintf-js').sprintf;

const ObjectUtil = require('./object-util');
const Version = require('./version');
const {Element, Message, Rect} = require('./element');

module.exports = class Diagram{
	static set_err_(err_, level, label, message)
	{
		err_.level = level;
		err_.label = label;
		err_.message = message;
	}

	static add_errs_(errs_, level, label, message)
	{
		let err_ = {};
		DaisyIO.set_err_(err_, level, label, message);

		if(! Array.isArray(errs_)){
			console.error(errs_);
			errs_ = [];
		}
		errs_.push(err_);
	}

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
		const {Range} = require('./element');

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

	static create_from_native_format_string(strdata, errs_)
	{
		let native_doc = {};
		try{
			native_doc = JSON.parse(strdata);
		}catch(err){
			console.debug(err);
			DaisyIO.add_errs_(errs_, 'error', "Diagram", err.message);
			return null;
		}

		if(! native_doc.hasOwnProperty('diagram')){
			DaisyIO.add_errs_(errs_, 'error', "Diagram", 'nothing property "diagram"');
			return null;
		}

		const sanitized_diagram = Diagram.sanitize(native_doc.diagram, errs_);
		if(null === sanitized_diagram){
			return null;
		}

		return sanitized_diagram;
	}

	static get_plantuml_string(src_diagram, errs_)
	{
		const add_errs_ = function(errs_, level, message)
		{
			const err_ = {
				'level':	level,
				'label':	"PlantUML convert",
				'message':	message,
			};
			errs_.push(err_);
		};

		if(null === src_diagram){
			add_errs_(errs_, "bug", "diagram is empty.");
			return null;
		}

		const diagram = ObjectUtil.deepcopy(src_diagram);

		let lifelines = [];
		let plantuml_elems = [];

		const func = function(recurse_info, element, opt){

			const func_set_lifeline_ident_name_ = function(element, lifelines)
			{
				let ident_name = element.text;
				ident_name = ident_name.replace(/\n/g, "_");
				ident_name = ident_name.replace(/[\[\]\s-,.?<>]/g, "_");
				ident_name = ident_name.replace(/[^A-Za-z_]/g, "_");
				ident_name = ident_name.replace(/_+/g, "_");

				// console.debug(sprintf("n:`%s` `%s`", element.text, ident_name));
				return sprintf("%s_%d", ident_name, element.id);
			};

			switch(element.kind){
				case 'lifeline':
					{
						opt.lifelines.push(element);
						let ident_name = func_set_lifeline_ident_name_(element, lifelines);
						ObjectUtil.make_member(element, 'work.ident_name', ident_name);
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
			return str.replace(/\n/g, "\\n");
		};

		const func_message_text_ = function(str)
		{
			str = str.replace(/[\n]+$/g, "");
			return str.replace(/\n/g, "\\n");
		};
		const func_get_lifeline_ident_name_ = function(element)
		{
			const ident_name = ObjectUtil.get_property_from_path(element, 'work.ident_name');
			return ident_name;
		};
		const func_lifeline_name_ = function(str)
		{
			str = str.replace(/[\n]+$/g, "");
			str = str.replace(/\n/g, "\\n");
			return '"' + str + '"';
		};
		const func_operand_text_ = function(str)
		{
			// loopを見た目をUMLに合わせるために"[loop]"と囲い付きで書いていた
			// 場合への対処だと思うが適当にしたのだと思われる。
			str = str.replace(/^[\[]+/, "");
			return str.replace(/[\]]+$/, "");
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
				if('[' === end_lifeline_ident_name || ']' === end_lifeline_ident_name){
					// NOP
				}else{
					strdata += sprintf("create %s\n", end_lifeline_ident_name);
				}
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
					case 'async':
						if(null === ObjectUtil.get_property_from_path(message, 'spec')){
							// NOP
						}else{
							strdata += sprintf("activate %s\n", end_lifeline_ident_name);
						}
						break;
					case 'reply':
						strdata += sprintf("deactivate %s\n", start_lifeline_ident_name);
						break;
					case 'stop':
						strdata += sprintf("deactivate %s\n", end_lifeline_ident_name);
						break;
					default:
						// NOP
				}
			}else{
				strdata += sprintf("' end lifeline %s\n", start_lifeline_ident_name);
			}

			if('stop' === message.message_kind){
				if('[' === end_lifeline_ident_name || ']' === end_lifeline_ident_name){
					// NOP
				}else{
					strdata += sprintf("destroy %s\n", end_lifeline_ident_name);
				}
			}

			// ** turnback message spec end
			if(null !== end_lifeline && start_lifeline_id === end_lifeline_id){
				const spec_height = ((end_lifeline.hasOwnProperty('spce'))? end_lifeline.spec.height : 30);
				if(! message.hasOwnProperty('spce')){
					console.debug("");
				}else{
					plantuml_opt.plantuml_ex_elems.push({
						'plantuml_ex_elem_kind': "spec_end",
						'y_end': (end_lifeline.y + spec_height),
						'lifeline_ident_name': end_lifeline_ident_name,
					});
				}
			}

			return strdata;
		};

		const func_plantuml_fragment_ = function(strdata, element, diagram, plantuml_opt)
		{
			const func_fragment_text_ = function(str)
			{
				// note内部の改行とtabはエスケープしなくて良い
				// plantuml上でnoteの内容文字列先頭にtabを付ける
				str = str.replace(/^/mg, "\t");
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

		const sequence_number_kind = ObjectUtil.get_property_from_path(diagram, 'property.sequence_number_kind');
		if(! sequence_number_kind){
			// NOP
		}else if('None' === sequence_number_kind || 'Nothing' === sequence_number_kind){
			// NOP
		}else if('Simple' === sequence_number_kind){
			strdata += 'autonumber "000:"\n\n';
		}else{
			console.warn('invalid property.sequenc_number_kind:', sequence_number_kind);
		}

		// ** lifeline
		lifelines = lifelines.sort(function(a, b){
			if(a.x < b.x) return -1;
			if(a.x > b.x) return 1;
			return 0;
		});
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
		// ** 文字列化前処理として、elementの上下に配置する必要のあるものを収集しておく
		for(let i = 0; i < plantuml_elems.length; i++){
			try{
				const plantuml_elem = plantuml_elems[i];
				switch(plantuml_elem.kind){
					case 'message':

						if(plantuml_elem.text.startsWith('turnback')){
							console.log("");
						}

						// *** repry_messageを持たないspecの末尾を収集しておく
						if(null === ObjectUtil.get_property_from_path(plantuml_elem, 'spec')){
							break;
						}
						if(null !== ObjectUtil.get_property_from_path(plantuml_elem, 'reply_message')){
							break;
						}
						if(null === ObjectUtil.get_property_from_path(plantuml_elem, 'end.lifeline_id')){
							break;
						}
						const lifeline_id = plantuml_elem.end.lifeline_id;
						const lifeline = Diagram.get_element_from_id(diagram, lifeline_id);
						const lifeline_ident_name = func_get_lifeline_ident_name_(lifeline);
						plantuml_opt.plantuml_ex_elems.push({
							'plantuml_ex_elem_kind': "spec_end",
							'y_end': plantuml_elem.y + plantuml_elem.spec.height,
							'lifeline_ident_name': lifeline_ident_name,
						});
						break;
					default:
						// NOP
				}
			}catch(err){
				add_errs_(errs_, "bug", sprintf("exeption ex_elem %s", err.message));
				continue;
			}
		}
		// ** elementおよびその上下に差し込まれるplantuml要素を上から文字列生成
		for(let i = 0; i < plantuml_elems.length; i++){
			try{
				let latest_y = 0;
				switch(plantuml_elems[i].kind){
					case 'message':
					case 'fragment':
					latest_y = plantuml_elems[i].y;
				}

				// ** fragment end(not memo ex.alt, loop...)
				for(let t = plantuml_opt.plantuml_ex_elems.length - 1; 0 <= t; t--){
					switch(plantuml_opt.plantuml_ex_elems[t].plantuml_ex_elem_kind){
						case "spec_end":
							if(plantuml_opt.plantuml_ex_elems[t].y_end < latest_y){
								strdata += "' spec_end ex_elem in elem loop\n"
								strdata += sprintf("deactivate %s\n", plantuml_opt.plantuml_ex_elems[t].lifeline_ident_name);
								plantuml_opt.plantuml_ex_elems.splice(t, 1);
							}
							break;
						case "fragment_end":
							if(plantuml_opt.plantuml_ex_elems[t].y_end < latest_y){
								strdata += "end\n";
								strdata += sprintf("' fragment_end ex_elem in elem loop %s\n\n", plantuml_opt.plantuml_ex_elems[t].fragment.kind);
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

			}catch(err){
				add_errs_(errs_, "bug", sprintf("exeption ex_elem %s", err.message));
				continue;
			}
		}

		plantuml_opt.plantuml_ex_elems.sort(function(a, b){
			if(a.y_end < b.y_end) return -1;
			if(a.y_end > b.y_end) return 1;
			return 0;
		});
		for(let t = 0; t < plantuml_opt.plantuml_ex_elems.length; t++){
			try{
				switch(plantuml_opt.plantuml_ex_elems[t].plantuml_ex_elem_kind){
					case "spec_end":
						{
							strdata += "' spec_end ex_elem\n"
							strdata += sprintf("deactivate %s\n", plantuml_opt.plantuml_ex_elems[t].lifeline_ident_name);
						}
						break;
					case "fragment_end":
						{
							strdata += sprintf("' fragment end ex_elem %s\n", plantuml_opt.plantuml_ex_elems[t].fragment.kind);
							strdata += "end\n";
							strdata += "\n";
						}
						break;
					case "operand":
						{
							strdata += "' operand ex_elem\n"
							strdata += sprintf("else %s\n", func_operand_text_(plantuml_opt.plantuml_ex_elems[t].operand.text));
						}
						break;
				}
			}catch(err){
				add_errs_(errs_, "bug", sprintf("exeption ex_elem %s", err.message));
				continue;
			}
		}

		strdata += "\n@enduml\n";

		return strdata;
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
			// elementをdeleteする際に親子関係を無視しているためここにかかるのは問題ない。
			console.warn(id, opt.parent_obj);
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

	static sanitize(src_diagram, errs_)
	{
		let diagram = ObjectUtil.deepcopy(src_diagram);
		// ** 無い古いドキュメントへの互換性fix
		if(! ObjectUtil.get_property_from_path(diagram, 'property.sequence_number_kind')){
			console.log("compatibility fix: add diagram.property.sequence_number_kind = None");
			ObjectUtil.makeMember(diagram, 'property.sequence_number_kind', "None");
		}
		return diagram;
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

