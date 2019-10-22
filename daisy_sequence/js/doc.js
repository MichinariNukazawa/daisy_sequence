'use strict';

const Version = require('./js/version');
const Diagram = require('./js/diagram');
//const ObjectUtil = require('./js/object-util');

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

function get_default_doc(){
	let err_ = {};
	const filepath = path.join(__dirname, 'resource/default_document.daisysequence');
	const diagram = DaisyIO.open_diagram_from_path(filepath, err_);
	if(null === diagram){
		console.warn(errs_);
		return null;
	}

	const doc = Doc.create_from_diagram(diagram);

	return doc;
}

/** doc を操作するstatic methodの集合 */
class Doc{
	static create_from_diagram(diagram)
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
		let diagram = ObjectUtil.deepcopy(src_diagram);
		ObjectUtil.remove_key(diagram, 'work');
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
		ObjectUtil.make_member(doc, 'work.event_listener_on_saves', []);

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
		const diagram = ObjectUtil.deepcopy(src_history.diagram);

		// ** copy focus
		//! @notice focus.* is direct copy excluded focus.elements because this is reference
		let focus = {};
		focus.work = src_history.focus.work;
		focus.focus_state = ObjectUtil.deepcopy(src_history.focus.focus_state);

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

