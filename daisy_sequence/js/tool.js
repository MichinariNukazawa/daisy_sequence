'use strict';

Element.prototype.remove = function() {
	this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
	for(var i = this.length - 1; i >= 0; i--) {
		if(this[i] && this[i].parentElement) {
			this[i].parentElement.removeChild(this[i]);
		}
	}
}

class Tool{
	constructor(){
		this.tools = [
			{
				'kind':			'element_arrow',
				'element':		document.getElementById('tool__element-arrow'),
				'callback_mousedown':	Tool.callback_mousedown_element_arrow_,
				'callback_mouseup':	Tool.callback_mouseup_nop_,
			},
			{
				'kind':			'simple_element_arrow',
				'element':		document.getElementById('tool__simple-element-arrow'),
				'callback_mousedown':	Tool.callback_mousedown_element_arrow_,
				'callback_mouseup':	Tool.callback_mouseup_nop_,
			},
			{
				'kind':			'move_height_arrow',
				'element':		document.getElementById('tool__move-height-arrow'),
				'callback_mousedown':	Tool.callback_mousedown_move_height_arrow_,
				'callback_mouseup':	Tool.callback_mouseup_nop_,
			},
			{
				'kind':			'add_lifeline',
				'element':		document.getElementById('tool__add-lifeline'),
				'callback_mousedown':	Tool.callback_mousedown_add_lifeline_,
				'callback_mouseup':	Tool.callback_mouseup_create_element_tool_,
			},
			{
				'kind':			'add_message',
				'element':		document.getElementById('tool__add-message'),
				'callback_mousedown':	Tool.callback_mousedown_add_message_,
				'callback_mouseup':	Tool.callback_mouseup_create_element_tool_,
			},
			{
				'kind':			'add_fragment',
				'element':		document.getElementById('tool__add-fragment'),
				'callback_mousedown':	Tool.callback_mousedown_add_fragment_,
				'callback_mouseup':	Tool.callback_mouseup_create_element_tool_,
			},
			{
				'kind':			'add_divider',
				'element':		document.getElementById('tool__add-divider'),
				'callback_mousedown':	Tool.callback_mousedown_add_divider_,
				'callback_mouseup':	Tool.callback_mouseup_create_element_tool_,
			},
		];

		this.tool_kind = this.tools[0].kind;

		this.callback_tool_changes = [];

		this.init_();

		this.rendering_();
	}

	init_()
	{
		console.debug(this.tools.length);
		for(let i = 0; i < this.tools.length; i++){
			this.tools[i].element.addEventListener('click', this.callback_clicked_tool_.bind(this), false);
		}

		if("ja" !== navigator.language){
			document.getElementsByClassName("hover_message").remove();
		}
	}

	rendering_()
	{
		for(let i = 0; i < this.tools.length; i++){
			if(this.tools[i].kind === this.get_tool_kind()){
				this.tools[i].element.classList.add('tool-selected');
			}else{
				this.tools[i].element.classList.remove('tool-selected');
			}
		}
	}

	callback_clicked_tool_(e)
	{
		// console.log(e.target);

		let next_tool_kind = '';
		for(let i = 0; i < this.tools.length; i++){
			if(e.target == this.tools[i].element){
				next_tool_kind = this.tools[i].kind;
				break;
			}
		}
		if('' === next_tool_kind){
			console.error(e.target);
			alert('internal error');
			return;
		}
		this.tool_kind = next_tool_kind;

		for(let i = 0; i < this.callback_tool_changes.length; i++){
			this.callback_tool_changes[i](this.tool_kind);
		}

		this.rendering_();
	}

	add_callback_tool_change(callback){
		this.callback_tool_changes.push(callback);
	}

	get_tool_kind()
	{
		return this.tool_kind;
	}

	get_tool_info_from_kind(tool_kind)
	{
		for(let i = 0; i < this.tools.length; i++){
			if(tool_kind === this.tools[i].kind){
				return this.tools[i];
			}
		}
		return null;
	}

	static callback_mousedown_element_arrow_(mouse_state)
	{
		const {Element, Message, Spec, Fragment, Rect, Range} = require('./js/element');

		let diagram = daisy.get_current_diagram();
		let focus = Doc.get_focus(daisy.get_current_doc());

		// ** focus element
		let element = Diagram.get_element_of_touch(diagram, mouse_state.point);
		if(! Focus.get_elements(focus).includes(element)){
			Focus.set_element(focus, element);
		}

		// ** focus message side
		if(null !== element && 'message' === element.kind){
			const side = Element.get_lr_side_of_touch(element, mouse_state.point);
			focus.focus_state.side = side;
			const message_side = Message.get_message_side_from_element_side(element, side);
			focus.focus_state.message_side = message_side;

			return;
		}

		// ** focus fragment size
		if(null !== element && 'fragment' === element.kind){
			const edge = Element.get_edge_of_touch(element, mouse_state.point);
			focus.focus_state.edge = edge;

			return;
		}
	}

	static callback_mousedown_move_height_arrow_(mouse_state)
	{
		const {Element, Message, Spec, Fragment, Rect, Range} = require('./js/element');

		const diagram = daisy.get_current_diagram();
		let focus = Doc.get_focus(daisy.get_current_doc());
		Focus.clear(focus);

		const func = function(recurse_info, element, opt){
			let rect = Element.get_rect(element);
			if(null == rect){
				return true;
			}

			if('operand' === element.kind){
				return true;
			}

			if(opt.y < rect.y){
				Focus.append_element(opt.focus, element);
				return true;
			}

			if('spec' === element.kind){
				if(opt.y < rect.y + rect.height){
					Focus.append_element(opt.focus, element);
					return true;
				}
			}

			return true;
		};
		let opt = {'ignore_keys':['work'], 'focus':focus, 'y': mouse_state.point.y};
		Element.recursive(diagram.diagram_elements, func, opt);

		return;
	}

	static callback_mousedown_add_lifeline_(mouse_state)
	{
		{
			Doc.history_add(daisy.get_current_doc());
		}

		let diagram = daisy.get_current_diagram();

		let i = 0;
		let lifeline_name;
		let exist_lifeline;
		do{
			lifeline_name = 'New Lifeline' + i;
			exist_lifeline = Diagram.get_lifeline_from_name(diagram, lifeline_name);
			i++;
		}while(null !== exist_lifeline);

		let data = {
			'text': lifeline_name,
			'x': mouse_state.point.x,
		};
		let lifeline = Diagram.create_append_element(diagram, 'lifeline', data);
		if(null === lifeline){
			console.error('');
			return;
		}

		let focus = Doc.get_focus(daisy.get_current_doc());
		Focus.set_element(focus, lifeline);
	}

	static callback_mousedown_add_message_(mouse_state)
	{
		const {Message} = require('./js/element');

		{
			Doc.history_add(daisy.get_current_doc());
		}

		let diagram = daisy.get_current_diagram();

		let data = {
			'y': mouse_state.point.y,
			'start': {'position_x': mouse_state.point.x},
			'end': {'position_x': mouse_state.point.x + 10},
		};
		let message = Diagram.create_append_element(diagram, 'message', data);
		if(null === message){
			console.error('');
			return;
		}

		Message.change_side_from_point(message, diagram, 'start', mouse_state.point);

		let focus = Doc.get_focus(daisy.get_current_doc());
		Focus.set_element(focus, message);
		focus.focus_state.message_side = 'end';
	}

	static callback_mousedown_add_fragment_(mouse_state)
	{
		{
			Doc.history_add(daisy.get_current_doc());
		}

		let diagram = daisy.get_current_diagram();

		let data = {
			'y': mouse_state.point.y,
			'x': mouse_state.point.x,
		};
		let fragment = Diagram.create_append_element(diagram, 'fragment', data);
		if(null === fragment){
			console.error('');
			return;
		}

		let focus = Doc.get_focus(daisy.get_current_doc());
		Focus.set_element(focus, fragment);
	}

	static callback_mousedown_add_divider_(mouse_state)
	{
		{
			Doc.history_add(daisy.get_current_doc());
		}

		let diagram = daisy.get_current_diagram();

		let data = {
			'x': mouse_state.point.x,
			'y': mouse_state.point.y,
			'text': 'divider',
		};
		let divider = Diagram.create_append_element(diagram, 'divider', data);
		if(null === divider){
			console.error('');
			return;
		}

		let focus = Doc.get_focus(daisy.get_current_doc());
		Focus.set_element(focus, divider);
	}

	static callback_mouseup_nop_(mouse_state)
	{
		// NOP
	}

	static callback_mouseup_create_element_tool_(mouse_state)
	{
		let elem = document.getElementById('editor__element-text');
		elem.focus();
		elem.select();
	}
};

