'use strict';

class Daisy{
	constructor()
	{
		this.current_doc_id = -1;
		this.event_listener_current_doc_changes = [];
	}

	append_doc_id(doc_id)
	{
		if(-1 !== doc_id){
			let doc = doc_collection.get_doc_from_id(doc_id);
			let diagram = Doc.get_diagram(doc);

			Doc.add_event_listener_history_change(doc, callback_history_change_doc);
			Doc.add_event_listener_on_save(doc, callback_on_save_doc);
			let focus = Doc.get_focus(doc);
			Focus.add_event_listener_focus_change(focus, callback_focus_change, doc);

			this.set_current_doc_id_(doc_id);

			callback_history_change_doc(doc, '-');

			Renderer.rerendering(rendering_handle, daisy.get_current_doc(), mouse_state);
		}else{
			this.set_current_doc_id_(doc_id);

			Renderer.rerendering(rendering_handle, daisy.get_current_doc(), mouse_state);
		}
	}

	remove_doc_id(doc_id)
	{
		this.set_current_doc_id_(-1);
		doc_collection.remove_doc(doc_id);
		Renderer.rerendering(rendering_handle, daisy.get_current_doc(), mouse_state);
	}

	set_current_doc_id_(doc_id)
	{
		this.current_doc_id = doc_id;
		Renderer.rerendering(rendering_handle, daisy.get_current_doc(), mouse_state);
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

	get_current_doc_svg_format_string()
	{
		if(-1 === this.current_doc_id){
			return null;
		}

		let draw = rendering_handle.get_draw();
		if(null === draw){
			return null;
		}

		rendering_handle.get_focus_group().remove();
		let s = draw.svg();

		Renderer.rerendering(rendering_handle, this.get_current_doc(), mouse_state);

		const h = sprintf("<!-- Generator: %s %s  -->", Version.get_name(), Version.get_version());
		s = h + s;

		let options = {indentation: '\t',};
		return xml_formatter(s, options);
	}

	change()
	{
		this.call_event_listener_current_doc_change_();
		Renderer.rerendering(rendering_handle, this.get_current_doc(), mouse_state);
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

