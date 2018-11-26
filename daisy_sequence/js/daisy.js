'use strict';

const Renderer = require('./renderer').Renderer;

module.exports = class Daisy{
	constructor(callback_focus_change, callback_history_change_doc)
	{
		this.current_doc_id = -1;
		this.event_listener_current_doc_changes = [];

		this.callback_focus_change = callback_focus_change;
		this.callback_history_change_doc = callback_history_change_doc;
	}

	append_doc_id(doc_id)
	{
		if(-1 !== doc_id){
			let doc = doc_collection.get_doc_from_id(doc_id);
			let diagram = Doc.get_diagram(doc);

			Doc.add_event_listener_history_change(doc, this.callback_history_change_doc);
			Doc.add_event_listener_on_save(doc, callback_on_save_doc);
			let focus = Doc.get_focus(doc);
			Focus.add_event_listener_focus_change(focus, this.callback_focus_change, doc);

			this.set_current_doc_id_(doc_id);

			this.callback_history_change_doc(doc, '-');

			Renderer.rerendering(rendering_handle, this.get_current_diagram(), Doc.get_focus(this.get_current_doc()), mouse_state, tool.get_tool_kind());
		}else{
			this.set_current_doc_id_(doc_id);

			Renderer.rerendering(rendering_handle, this.get_current_diagram(), Doc.get_focus(this.get_current_doc()), mouse_state, tool.get_tool_kind());
		}
	}

	remove_doc_id(doc_id)
	{
		this.set_current_doc_id_(-1);
		doc_collection.remove_doc(doc_id);
		Renderer.rerendering(rendering_handle, this.get_current_diagram(), Doc.get_focus(this.get_current_doc()), mouse_state, tool.get_tool_kind());
	}

	set_current_doc_id_(doc_id)
	{
		this.current_doc_id = doc_id;
		Renderer.rerendering(rendering_handle, this.get_current_diagram(), Doc.get_focus(this.get_current_doc()), mouse_state, tool.get_tool_kind());
		this.call_event_listener_current_doc_change_();
	}

	get_current_doc_id()
	{
		return this.current_doc_id;
	}

	get_current_doc()
	{
		return doc_collection.get_doc_from_id(this.get_current_doc_id());
	}

	get_current_diagram()
	{
		const doc = daisy.get_current_doc();
		if(null === doc){
			return null;
		}

		return Doc.get_diagram(doc);
	}

	get_current_single_focus_element()
	{
		const doc = this.get_current_doc();
		if(null === doc){
			return null;
		}
		const focus = Doc.get_focus(doc);
		const elements = Focus.get_elements(focus);
		if(1 !== elements.length){
			return null;
		}else{
			return elements[0];
		}
	}

	change()
	{
		this.call_event_listener_current_doc_change_();
		Renderer.rerendering(rendering_handle, this.get_current_diagram(), Doc.get_focus(this.get_current_doc()), mouse_state, tool.get_tool_kind());
	}

	add_event_listener_current_doc_change(callback)
	{
		this.event_listener_current_doc_changes.push(callback);
	}

	call_event_listener_current_doc_change_()
	{
		for(let i = 0; i < this.event_listener_current_doc_changes.length; i++){
			this.event_listener_current_doc_changes[i](this.current_doc_id);
		}
	}
};

