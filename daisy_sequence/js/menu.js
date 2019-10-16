'use strict';

const remote = require('electron').remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const join = require('path').join;
const openAboutWindow = require('about-window').default;

function message_dialog(strtype, strtitle, strmessage) {
	const {dialog} = require('electron').remote;
	dialog.showMessageBoxSync(
			remote.getCurrentWindow(),
			{
				type: strtype,
				buttons: ['OK'],
				title: ((typeof strtitle === 'string')? strtitle:'<none>'),
				message: strmessage,
			});
}

function confirm_dialog(strtitle, strmessage) {
	const {dialog} = require('electron').remote;
	let choice = dialog.showMessageBoxSync(
			remote.getCurrentWindow(),
			{
				type: 'question',
				buttons: ['Yes', 'No'],
				defaultId: 1,
				title: strtitle,
				message: strmessage,
			});

	return choice === 0;
};

function open_dialog(default_filepath)
{
	const {app} = require('electron').remote;
	const {dialog} = require('electron').remote;
	const fs = require('fs');
	const isExistSync = function(file)
	{
		try{
			fs.statSync(file);
		}catch(err){
			return false;
		}
		return true
	};

	let open_filepath = app.getPath('home');
	if('' != default_filepath){
		default_filepath = path.resolve(default_filepath);
		const dirpath = path.dirname(default_filepath);
		if(isExistSync(default_filepath)){
			open_filepath = default_filepath;
		}else if(isExistSync(dirpath) && fs.statSync(dirpath).isDirectory()){
			open_filepath = dirpath;
		}
	}
	console.debug('open_filepath', open_filepath);

	let filepath = dialog.showOpenDialogSync(
			remote.getCurrentWindow(),
			{
				title: 'Open',
				defaultPath: open_filepath,
				filters: [
				{name: 'Documents', extensions: ['daisysequence']},
				{name: 'All', extensions: ['*']},
				],
				properties: ['openFile'],
			});

	if(typeof filepath === "undefined"){
		return '';
	}

	filepath = filepath[0];
	return filepath;
}

function save_dialog(title, default_filepath)
{
	const {app} = require('electron').remote;
	const {dialog} = require('electron').remote;

	if('' == default_filepath){
		// 拡張子のみのファイルパスを作っておくとdialogが勝手にoverwrite確認をしてくれる
		default_filepath = path.join(app.getPath('home'), '.' + 'daisysequence');
	}
	let filepath = dialog.showSaveDialogSync(
			remote.getCurrentWindow(),
			{
				'title': title,
				defaultPath: default_filepath,
				filters: [
				{name: 'Documents', extensions: ['daisysequence']},
				{name: 'All', extensions: ['*']},
				],
			});
	if(typeof filepath === "undefined"){
		return '';
	}

	return filepath;
}

function export_dialog(default_filepath, format_name)
{
	const {app} = require('electron').remote;
	const {dialog} = require('electron').remote;

	if('' == default_filepath){
		default_filepath = path.join(app.getPath('home'), '.' + format_name);
	}else{
		default_filepath = default_filepath.replace(/\.[a-zA-Z0-9]*$/, '.' + format_name);
	}
	let filepath = dialog.showSaveDialogSync(
			remote.getCurrentWindow(),
			{
				title: 'Export',
				defaultPath: default_filepath,
				filters: [
				{name: format_name, extensions: [format_name]},
				{name: 'All', extensions: ['*']},
				],
			});
	if(typeof filepath === "undefined"){
		return '';
	}

	return filepath;
}

function menu_do_export_(format_name)
{
	const doc = daisy.get_current_doc();
	if(null === doc){
		message_dialog(
				'info', "Export",
				"nothing opened document.");
		return;
	}

	let filepath = Doc.get_filepath(doc);
	filepath = export_dialog(filepath, format_name);
	if('' == filepath){
		return;
	}

	let errs_ = [];
	let res = DaisyIO.write_export_diagram(filepath, Doc.get_diagram(doc), errs_);

	let message_ = "";
	for(let i = 0; i < errs_.length; i++){
		message_ += sprintf("%s: %s\n", errs_[i].level, errs_[i].message);
	}

	if(! res){
		message_dialog('warning', "Export", "Export error.\n" + message_);
		return;
	}else{
		if(0 !== errs_.length){
			message_dialog('info', "Export", "Export info.\n" + message_);
		}
	}

	console.log("Export");
}

const debug_menu = {
	label: 'debug(develop)',
	submenu: [
/*
	{
		label: 'Reload',
		accelerator: 'CmdOrCtrl+R',
		click: function (item, focusedWindow) {
			if (focusedWindow) focusedWindow.reload()
		}
	},
	{
		label: 'Toggle Full Screen',
		accelerator: (function () {
			if (process.platform === 'darwin') {
				return 'Ctrl+Command+F'
			} else {
				return 'F11'
			}
		})(),
		click: function (item, focusedWindow) {
			if (focusedWindow) {
				focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
			}
		}
	},
*/
	{
		label: 'Toggle Developer Tools',
		accelerator: (function () {
			if (process.platform === 'darwin') {
				return 'Alt+Command+I'
			} else {
				return 'Ctrl+Shift+I'
			}
		})(),
		click: function (item, focusedWindow) {
			if (focusedWindow) focusedWindow.toggleDevTools()
		}
	}
	]
};

var template = [
{
	label: '&File',
	submenu: [
	{
		label: '&New',
		accelerator: 'CmdOrCtrl+N',
		click: function () {
			{
				const doc = daisy.get_current_doc();
				if(null !== doc){
					message_dialog(
							'info', "Open",
							"already opened document.");
					return;
				}
			}

			const doc_id = doc_collection.create_doc();

			daisy.append_doc_id(doc_id);

			let doc = doc_collection.get_doc_from_id(doc_id);
			Doc.on_save(doc);

			console.log("New");
		},
	},
	{
		label: '&Open',
		accelerator: 'CmdOrCtrl+O',
		click: function () {
			{
				const doc = daisy.get_current_doc();
				if(null !== doc){
					message_dialog(
							'info', "Open",
							"already opened document.");
					return;
				}
			}

			let filepath = open_dialog(latest_saved_filepath);
			if('' == filepath){
				return;
			}
			console.debug(filepath);

			let errs_ = [];
			if(-1 == daisy.open_doc_from_path(filepath, errs_)){
				console.error(errs_);
				//! @todo shot other errors.
				message_dialog(errs_[0].level, errs_[0].label, errs_[0].message);
				return;
			}

			console.log("Open:`%s`", filepath);
		}
	},
	{
		label: '&Save',
		accelerator: 'CmdOrCtrl+S',
		click: function () {
			const doc = daisy.get_current_doc();
			if(null === doc){
				message_dialog(
						'info', "Save",
						"nothing opened document.");
				return;
			}

			let filepath = Doc.get_filepath(doc);
			if('' == filepath){
				filepath = save_dialog('Save', '');
				if('' == filepath){
					return;
				}
			}
			console.debug(filepath);

			const strdata = Doc.get_native_format_string(doc);
			if(null === strdata){
				message_dialog(
						'warning', "Save",
						"internal error. (get_native_format)");
				return;
			}

			try{
				fs.writeFileSync(filepath, strdata);
			}catch(err){
				message_dialog(
						'warning', "Save",
						"internal error. (writeFile):\n`" + filepath + "`");
				return;
			}

			Doc.set_filepath(doc, filepath);
			Doc.on_save(doc);

			console.log("Save:`%s`", filepath);
		}
	},
	{
		label: 'Save &As',
		accelerator: 'CmdOrCtrl+Shift+S',
		click: function () {
			const doc = daisy.get_current_doc();
			if(null === doc){
				message_dialog(
						'info', "Save As",
						"nothing opened document.");
				return;
			}

			let filepath = Doc.get_filepath(doc);
			filepath = save_dialog('Save As', filepath);
			if('' == filepath){
				return;
			}
			console.debug(filepath);

			const strdata = Doc.get_native_format_string(doc);
			if(null === strdata){
				message_dialog(
						'warning', "Save As",
						"internal error. (get_native_format)");
				return;
			}

			try{
				fs.writeFileSync(filepath, strdata);
			}catch(err){
				message_dialog(
						'warning', "Save As",
						"internal error. (writeFile):\n`" + filepath + "`");
				return;
			}

			Doc.set_filepath(doc, filepath);
			Doc.on_save(doc);

			console.log("Save As:`%s`", filepath);
		}
	},
	{
		label: '&Export SVG',
		accelerator: 'CmdOrCtrl+Shift+E',
		click: function () {
			menu_do_export_('svg');
		}
	},
	{
		label: 'Export PlantUML(.puml)',
		click: function () {
			menu_do_export_('puml');
		}
	},
	{
		label: 'Export PNG (x4 size)',
		click: function () {
			menu_do_export_('png');
		}
	},
	{
		label: '&Close',
		accelerator: 'CmdOrCtrl+W',
		click: function () {
			const doc = daisy.get_current_doc();
			if(null === doc){
				message_dialog(
						'info', "Close",
						"nothing opened document.");
				return;
			}

			if(! Doc.is_on_save(doc)){
				let res = confirm_dialog('Close', 'Close now?');
				if(! res){
					console.debug('cancel Close');
					return;
				}
			}

			const doc_id = doc_collection.get_doc_id_from_doc(doc);
			daisy.remove_doc_id(doc_id);

			console.log("Close %d", doc_id);
		}
	},
	{type: 'separator'},
	{
		label: '&Quit',
		accelerator: 'CmdOrCtrl+Q',
		click: function () {
			const {app} = require('electron').remote;
			const doc = daisy.get_current_doc();
			if(null === doc){
				app.quit();
				return;
			}

			if(! Doc.is_on_save(doc)){
				let res = confirm_dialog('Quit', 'Quit now?');
				if(! res){
					console.debug('cancel Quit');
					return;
				}
			}

			app.quit();
		},
	},
	]
},
{
	label: '&Edit',
	submenu: [
	{
		label: '&Undo',
		accelerator: 'CmdOrCtrl+Z',
		click: function () {
			let doc = daisy.get_current_doc();
			if(null !== doc){
				Doc.undo(doc);
			}
		}
	},
	{
		label: '&Redo',
		accelerator: 'CmdOrCtrl+Shift+Z',
		click: function () {
			let doc = daisy.get_current_doc();
			if(null !== doc){
				Doc.redo(doc);
			}
		}
	},
	{type: 'separator'},
	{
		label: 'All',
		// accelerator: 'CmdOrCtrl+A',
		click: function () {
			const diagram = daisy.get_current_diagram();
			if(null === diagram){
				return;
			}

			const elements = Element.get_child_elements(diagram.diagram_elements);
			let focus = Doc.get_focus(daisy.get_current_doc());
			Focus.append_elements(focus, elements);

			daisy.change();
		}
	},
	{
		label: 'None',
		accelerator: 'CmdOrCtrl+Shift+A',
		click: function () {
			const diagram = daisy.get_current_diagram();
			if(null === diagram){
				return;
			}

			let focus = Doc.get_focus(daisy.get_current_doc());
			Focus.clear(focus);

			daisy.change();
		}
	},
	{
		label: 'Invert',
		accelerator: 'CmdOrCtrl+I',
		click: function () {
			const diagram = daisy.get_current_diagram();
			if(null === diagram){
				return;
			}

			const elements = Element.get_child_elements(diagram.diagram_elements);
			let focus = Doc.get_focus(daisy.get_current_doc());
			const focus_elements = Focus.get_elements(focus);

			let dst = [];
			for(let i = 0; i < elements.length; i++){
				if(! focus_elements.includes(elements[i])){
					dst.push(elements[i]);
				}
			}

			Focus.clear(focus);
			Focus.append_elements(focus, dst);
			daisy.change();
		}
	},
	{type: 'separator'},
	{
		label: 'Raise',
		accelerator: 'CmdOrCtrl+Shift+PageUp',
		click: function () {
			let element = daisy.get_current_single_focus_element();
			if(null === element){
				return;
			}

			{
				Doc.history_add(daisy.get_current_doc());
			}

			let diagram = daisy.get_current_diagram();
			Diagram.reorder_from_element_id(diagram, element.id, "Raise");

			daisy.change();
		}
	},
	{
		label: 'Lower',
		accelerator: 'CmdOrCtrl+Shift+PageDown',
		click: function () {
			let element = daisy.get_current_single_focus_element();
			if(null === element){
				return;
			}

			{
				Doc.history_add(daisy.get_current_doc());
			}

			let diagram = daisy.get_current_diagram();
			Diagram.reorder_from_element_id(diagram, element.id, "Lower");

			daisy.change();
		}
	},
	{
		label: 'Raise to Top',
		accelerator: 'CmdOrCtrl+Shift+Home',
		click: function () {
			let element = daisy.get_current_single_focus_element();
			if(null === element){
				return;
			}

			{
				Doc.history_add(daisy.get_current_doc());
			}

			let diagram = daisy.get_current_diagram();
			Diagram.reorder_from_element_id(diagram, element.id, "Top");

			daisy.change();
		}
	},
	{
		label: 'Lower to End',
		accelerator: 'CmdOrCtrl+Shift+End',
		click: function () {
			let element = daisy.get_current_single_focus_element();
			if(null === element){
				return;
			}

			{
				Doc.history_add(daisy.get_current_doc());
			}

			let diagram = daisy.get_current_diagram();
			Diagram.reorder_from_element_id(diagram, element.id, "End");

			daisy.change();
		}
	},
	{type: 'separator'},
	{
		label: '&Delete Element(s)',
		accelerator: 'CmdOrCtrl+Delete',
		click: function () {
			delete_current_focus_elements();
		}
	},
	]
},
{
	label: '&Help',
	role: 'help',
	submenu: [
	{
		label: 'daisy bell official site',
		click: function () { require('electron').shell.openExternal('https://daisy-bell.booth.pm/') }
	},
	{
		label: 'Donate',
		submenu: [
		{
			label: 'Donate(Amazon)',
			click: function () { require('electron').shell.openExternal('http://amzn.asia/gxaSPhE') }
		},
		]
	},
	{
		label: 'Bug and Request',
		submenu: [
		{
			label: 'mailto:michinari.nukazawa@gmail.com',
			click: function () { require('electron').shell.openExternal('mailto:michinari.nukazawa@gmail.com') }
		},
		{
			label: 'twitter:@MNukazawa',
			click: function () { require('electron').shell.openExternal('https://twitter.com/MNukazawa') }
		},
		]
	},
	{
		label: 'GitHub',
		click: function () { require('electron').shell.openExternal('https://github.com/MichinariNukazawa/daisy_sequence') }
	},
	{type: 'separator'},
	debug_menu,
	{type: 'separator'},
	{
		label: '&About',
		click: function () {
			openAboutWindow({
				icon_path: join(__dirname, 'image/icon.png'),
				copyright: 'Copyright (c) 2018 project daisy bell',
				package_json_dir: __dirname,
				// open_devtools: process.env.NODE_ENV !== 'production',
			});
		}
	}
	]
}
]

function insert_window_menu(){
	template.splice(2, 0,
			{
				label: 'Window',
				role: 'window',
				submenu: [
				{
					label: 'Minimize',
					accelerator: 'CmdOrCtrl+M',
					role: 'minimize'
				},
				{
					label: 'Close',
					accelerator: 'CmdOrCtrl+W',
					role: 'close'
				}
				]
			});
}

if (process.platform === 'darwin') {
	insert_window_menu();

	var name = require('electron').remote.app.getName()
		template.unshift({
			label: name,
			submenu: [
			{
				label: 'About ' + name,
				role: 'about'
			},
			{
				type: 'separator'
			},
			{
				label: 'Services',
				role: 'services',
				submenu: []
			},
			{
				type: 'separator'
			},
			{
				label: 'Hide ' + name,
				accelerator: 'Command+H',
				role: 'hide'
			},
			{
				label: 'Hide Others',
				accelerator: 'Command+Alt+H',
				role: 'hideothers'
			},
			{
				label: 'Show All',
				role: 'unhide'
			},
			{
				type: 'separator'
			},
			{
				label: 'Quit',
				accelerator: 'Command+Q',
				click: function () { app.quit() }
			}
			]
		})
	// Window menu.
	template[3].submenu.push(
			{
				type: 'separator'
			},
			{
				label: 'Bring All to Front',
				role: 'front'
			}
			)
}

var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

