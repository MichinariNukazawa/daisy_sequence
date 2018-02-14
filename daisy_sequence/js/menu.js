'use strict';

const remote = require('electron').remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

var menu = new Menu();

function message_dialog(strtype, strtitle, strmessage) {
	const {dialog} = require('electron').remote;
	dialog.showMessageBox(
			remote.getCurrentWindow(),
			{
				type: strtype,
				buttons: ['OK'],
				title: strtitle,
				message: strmessage,
			});
}

function confirm_dialog(strtitle, strmessage) {
	const {dialog} = require('electron').remote;
	let choice = dialog.showMessageBox(
			remote.getCurrentWindow(),
			{
				type: 'question',
				buttons: ['Yes', 'No'],
				title: strtitle,
				message: strmessage,
			});

	return choice === 0;
};

function open_dialog(default_filepath)
{
	const {app} = require('electron').remote;
	const {dialog} = require('electron').remote;

	default_filepath = ('' == default_filepath)? app.getPath('home'):default_filepath;
	let filepath = dialog.showOpenDialog(
			remote.getCurrentWindow(),
			{
				title: 'Open',
				defaultPath: default_filepath,
				filters: [
				{name: 'Documents', extensions: ['daisydiagram']},
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

function save_dialog(default_filepath)
{
	const {app} = require('electron').remote;
	const {dialog} = require('electron').remote;

	default_filepath = ('' == default_filepath)? app.getPath('home'):default_filepath;
	let filepath = dialog.showSaveDialog(
			remote.getCurrentWindow(),
			{
				title: 'Save',
				defaultPath: default_filepath,
				filters: [
				{name: 'Documents', extensions: ['daisydiagram']},
				{name: 'All', extensions: ['*']},
				],
			});

	filepath = (typeof filepath === "undefined")? '':filepath;
	return filepath;
}

function export_dialog(default_filepath, format_name)
{
	const {app} = require('electron').remote;
	const {dialog} = require('electron').remote;

	if('' == default_filepath){
		default_filepath = path.join(app.getPath('home'), '.' + format_name);
	}
	let filepath = dialog.showSaveDialog(
			remote.getCurrentWindow(),
			{
				title: 'Export',
				defaultPath: default_filepath,
				filters: [
				{name: format_name, extensions: [format_name]},
				{name: 'All', extensions: ['*']},
				],
			});

	filepath = (typeof filepath === "undefined")? '':filepath;
	return filepath;
}

var template = [
{
	label: 'File',
	submenu: [
	{
		label: 'New',
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
		label: 'Open',
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

			let filepath = open_dialog('');
			if('' == filepath){
				return;
			}
			console.debug(filepath);

			let strdata = '';
			try{
				strdata = fs.readFileSync(filepath, 'utf-8');
			}catch(err){
				console.error(err);
				message_dialog('warning', "Open", err.message);
				return;
			}

			let err = {};
			const doc_id = doc_collection.create_doc_from_native_format_string(strdata, err);
			if(-1 === doc_id){
				message_dialog('warning', "Open", err.message);
				return;
			}

			daisy.append_doc_id(doc_id);

			let doc = doc_collection.get_doc_from_id(doc_id);
			Doc.set_filepath(doc, filepath);
			Doc.on_save(doc);

			console.log("Open:`%s`", filepath);
		}
	},
	{
		label: 'Save',
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
				filepath = save_dialog('');
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
		label: 'Export',
		accelerator: 'CmdOrCtrl+Shift+E',
		click: function () {
			const doc = daisy.get_current_doc();
			if(null === doc){
				message_dialog(
						'info', "Export",
						"nothing opened document.");
				return;
			}

			const strdata = daisy.get_current_doc_svg_format_string();
			if(null === strdata){
				message_dialog(
						'warning', "Export",
						"internal error. (converter)");
			}

			let filepath = Doc.get_filepath(doc);
			filepath = export_dialog(filepath, 'svg');
			if('' == filepath){
				return;
			}

			try{
				fs.writeFileSync(filepath, strdata);
			}catch(err){
				message_dialog(
						'warning', "Export",
						"internal error. (writeFile):\n`" + filepath + "`");
				return;
			}

			console.log("Export");
		}
	},
	{
		label: 'Close',
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

			daisy.remove_doc_id(doc.id);

			console.log("Close");
		}
	},
	{
		label: 'Quit',
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
	label: 'Edit',
	submenu: [
	{
		label: 'Undo',
		accelerator: 'CmdOrCtrl+Z',
		click: function () {
			let doc = daisy.get_current_doc();
			if(null !== doc){
				Doc.undo(doc);
			}
		}
	},
	{
		label: 'Redo',
		accelerator: 'CmdOrCtrl+Shift+Z',
		click: function () {
			let doc = daisy.get_current_doc();
			if(null !== doc){
				Doc.redo(doc);
			}
		}
	},
	{
		label: 'Delete Element(s)',
		accelerator: 'Delete',
		click: function () {
			delete_current_focus_elements();
		}
	},
	]
},
{
	label: 'View(debug)',
	submenu: [
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
},
{
	label: 'Help',
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
		label: 'bug report',
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
		label: 'Help',
		click: function () {
			message_dialog(
					'info', "Help",
					"daisy sequence\nby michinari.nukazawa/project daisy bell");
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

