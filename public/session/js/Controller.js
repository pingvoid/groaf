/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/
var Controller = function(editor, data){
	this.editor = editor;
	this.data = data;	
	this.session= {};

	$(".interaction").mousedown( this.onMouseClick.bind(this));//GUI-Stuff
	$("#loadObjBtn").mousedown( this.importObject.bind(this));//Overlayed ancor 
	$("#fileload").change(this.handleFileSelect.bind(this));//Real input Element

	this.editor.interactionEvent.addListener('interaction', this.interaction.bind(this), false);
	document.addEventListener("keydown", this.onDocumentKeyDown.bind(this), false);
};
Controller.prototype = {
	/*
	*Method to start client as inventor
	*@param sessionID<Object>
	*/
	inventor : function(sessionID){
		//Set own SessionID(socket.io gernerated ID) for selectionHandling
		this.editor.sessionID = sessionID["sessionID"];
		//Initial session userlist
		this.editor.session[sessionID["sessionID"]] = this.editor.selected;
		//Create a new Scene
		this.editor.createScene();
		//Init editor
		this.editor.init();
		//Get scene as object
		var emitScene = this.editor.getSceneModel();
		//Emit scene to the server
		io.emit('session:setServerScene', {scene: emitScene, con_data:this.data});
	},
	/*
	*Method to start client as guest
	*@param sessionObj<Object>
	*/
	guest: function(sessionObj){
		//Set session userlist
		this.editor.session = sessionObj.activeSelections
		//Set own SessionID(socket.io gernerated ID)
		this.editor.sessionID = sessionObj.sessionID;
		//Set recived scene
		this.editor.setScenefromServer(sessionObj.scene);
		//Initialize editor
		this.editor.init();
	},
	/*
	*Handling key-event and delegating to the editor
	*@param evt <KeyboardEvent>
	*/
	onDocumentKeyDown: function( evt){
		// Get the key code of the pressed key 
		var keyCode = evt.which; 
		evt.preventDefault();
		switch ( keyCode ) {
			case 8: // 'Backspace' 
				io.emit('session:changeScene', {
					option:"remove", 
					uuid: this.editor.selected.uuid, 
					con_data:this.data
				});
				this.editor.removeObj( this.editor.selected );
				this.editor.removeHelper(this.editor.helpers[this.editor.selected.id]);
				this.editor.deselect();
				break;

			case 81: // Q
				this.editor.modifieSelection( "select" );
				break;

			case  87: // W
                this.editor.modifieSelection( "translate" );
                break;

            case 69: // E
                this.editor.modifieSelection( "rotate" );
                break;

			case 82: // R
                this.editor.modifieSelection( "scale" );
                break;
		}
	},
	/*
	*Handling mouse events on GUI
	*TODO: Reorgsanize in a more generic way(e.g. using data-attr)
	*@param evt <click-event>
	*/
	onMouseClick: function( evt ) {

		if (evt.target.id=='deleteBtn') {
			io.emit('session:changeScene', {
					option:"remove", 
					uuid: this.editor.selected.uuid, 
					con_data:this.data
				});
			this.editor.removeObj( this.editor.selected );
			this.editor.removeHelper(this.editor.helpers[this.editor.selected.id]);
			this.editor.deselect();
			return ;
		};
		if (evt.target.id=='addcubeBtn') {
			this.editor.createPrimitive('cube');
			return ;
		};
		if (evt.target.id=='addcylinder') {
			this.editor.createPrimitive('cylinder');
			return ;
		};
		if (evt.target.id=='addtorus') {
			this.editor.createPrimitive('torus');
			return ;
		};
		if (evt.target.id == 'transformBtn') {
			this.editor.modifieSelection("translate");
			return;
		};
		if (evt.target.id == 'rotateBtn') {
			this.editor.modifieSelection("rotate");
			console.log($(this));
			return;
		};
		if (evt.target.id == 'scaleBtn') {
			this.editor.modifieSelection("scale");
			console.log($(this));
			return;
		};
		if (evt.target.id == 'selectBtn') {
			this.editor.modifieSelection( "select" );
			console.log($(this));
			return ;
		};
	},
		/*
	*Eventlistener for all editor events to handle sync-data to the server
	*@param evt
	*/
	interaction: function(evt){
		//Sync deselect
		if (evt.interaction== "deselect") {
			io.emit('session:changeSelection', {selUuid:null, con_data:this.data});
		};
		//Sync select
		if (evt.interaction== "select") {
			io.emit('session:changeSelection', {selUuid:evt.selectionUuid, con_data:this.data});
		};
		//Sync new objects
		if (evt.interaction== "addObj") {
			io.emit('session:changeScene', {
				option:"add", 
				mesh: evt.obj, 
				con_data:this.data
			});
		};// addObj end

		//TODO fire event from editor
		if (evt.interaction == "removeObj") {
			// io.emit('session:changeScene', {
			// 		option:"remove", 
			// 		uuid: this.editor.selected.uuid, 
			// 		con_data:this.data
			// 	});
		};
		//Synchronising changings on objects
		if (evt.interaction == "changeObj") {
			io.emit('session:changeScene', {
							option:"change", 
							uuid: evt.uuid,
							vector3: evt.vector3,
							matrix: evt.matrix,
							mode: evt.mode,
							con_data:this.data
						});
			
		};
		//Updating object matrix at the end of a change on the server
		if (evt.interaction == "setState") {
			io.emit('session:setState', {
							uuid: evt.uuid,
							data: evt.data,
							mode: evt.mode,
							con_data:this.data
						});
			
		};
	},
	/*
	*Handling the data from the server (aka sync)
	*and deligating them to the editor
	*@param data<JSON-Object>
	*/
	handleScene: function(data){
		if (data.option== "add") {
			var loader = new THREE.ObjectLoader();
			var obj = loader.parse(data.mesh);
			//only add no sync
			this.editor.addObject(obj, false);
		};
		if (data.option== "remove") {
			var tmpObj = this.editor.getSceneElementByUuid(data.uuid);
			this.editor.removeObj(tmpObj);
		};
		if (data.option== "change") {
			var obj = this.editor.getSceneElementByUuid(data.uuid);
			var mode = data.mode;
			switch(mode){
				case "translate":
					obj.position.set(data.vector.x,data.vector.y, data.vector.z);
					break;

				case "rotate":
					var vec3 = new THREE.Vector3(data.vector._x,data.vector._y, data.vector._z);
					obj.rotation.setFromVector3(vec3, "XYZ");
					break;

				case "scale":
					obj.scale.set(data.vector.x,data.vector.y, data.vector.z);
					break;
			}
		};

	},
	/*
	*Handling new user and their selections
	*@param selectionObj<JSON-Object>
	*/
	handleSelections : function(selectionObj){
		//add a new user to the editor-session object
		if (selectionObj.option== "add") {
			this.editor.session[selectionObj.selectionID] = null;
		};
		//update other user selection(select/deselect)
		if (selectionObj.option== "change") {
			this.editor.session[selectionObj.selectionID] = selectionObj.uuid;		
		};
		//update editor-session if user left the session
		if (selectionObj.option== "remove") {
			delete this.editor.session[selectionObj.selectionID];
		};
	},
	/*
	*Checking if file API is availible
	*and trigger click event on the real input element
	*/
	importObject : function(){
		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
	  		// Trigger click on the real html input element
			$('#fileload').trigger( "click" );
		} 
		else {
		  	alert('The File APIs are not fully supported in this browser.');
		}		
	},
	/*
	*Handle file import
	*@param evt <Event - type:"change">
	*/
	handleFileSelect : function(evt){
		// get all elements from the selection
		var files = evt.target.files;
		var reader = new FileReader();
		var updateProgress = function(evt) {
		  	if (evt.lengthComputable) {
		    	// evt.loaded and evt.total are ProgressEvent properties
		    	var loaded = (evt.loaded / evt.total);
		    	if (loaded < 1) {
		    		//TODO: Implementing progressbar for bigger Objects
		      		// Increase the prog bar length
		      		// style.width = (loaded * 200) + "px";
		    	};
		  	};
		};
		var errorHandler= function(evt) {
		  	if(evt.target.error.name == "NotReadableError") {
		    	// The file could not be read
		    	console.log("There was an errror with the file"); 
		  	};
		};
		var obj;
		// Loop through the FileList and read the content
		for (var i = 0, f; f = files[i]; i++) {
			reader.readAsText(f);
			// Handle progress, success, and errors
			reader.onprogress = updateProgress;
			// Closure to capture the file information.
			reader.onload = (function(f){
				return function(evt){
					var fileString = evt.target.result;
					var objName = f.name;
					obj = new THREE.OBJLoader().parse(fileString);
					editor.addObject( obj, true );
				}
			})(f);
		}//LOOP END
		reader.onerror = errorHandler;
	} //handleFileSelect END
};
