/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/
var io = io.connect();
var editor;
var controller;
// Set Session name and type from url
var pin_endPos = document.URL.indexOf('&');
var pin_startPos = document.URL.lastIndexOf('/')+1;

var data = {
	"urlType" : document.URL.slice((pin_endPos+1), document.URL.length),
	"sessionName" : document.URL.slice(pin_startPos, pin_endPos)
};
// Init IO-Call for the inital user
io.on('inventor', function(sessionID) {
	
	editor = new Editor();
	controller = new Controller(editor, data);	
	controller.inventor(sessionID);
});
// Init IO-Call for the guest user
io.on('sync', function(sessionObj) {
	editor = new Editor();
	controller = new Controller(editor, data);
	controller.guest(sessionObj);
});
// IO-Call for synchronising interactions on the scene
io.on('sceneChange', function(data){
	controller.handleScene(data);
});
//IO-Call to synchronise selection
io.on('selectionsChange', function(obj){
	controller.handleSelections(obj);
});
// once everything is loaded, we call the server 
// to start client as inventor or guest
window.onload = io.emit('session:ready',{con_data: data});
