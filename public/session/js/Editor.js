/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/


//Custom editor event
function EditorEvent(){
    this._listeners = {};
}
EditorEvent.prototype = {
    constructor: EditorEvent,
    addListener: function(type, listener){
        if (typeof this._listeners[type] == "undefined"){
            this._listeners[type] = [];
        }
        this._listeners[type].push(listener);
    },
    fire: function(event){
        if (typeof event == "string"){
            event = { type: event };
        }
        if (!event.target){
            event.target = this;
        }
        if (!event.type){  //falsy
            throw new Error("Event object missing 'type' property.");
        }
        if (this._listeners[event.type] instanceof Array){
            var listeners = this._listeners[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
                listeners[i].call(this, event);
            }
        }
    },
    removeListener: function(type, listener){
        if (this._listeners[type] instanceof Array){
            var listeners = this._listeners[type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (listeners[i] === listener){
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    }
};

var Editor = function(){
	this.camera;

	this.raycaster = new THREE.Raycaster(); 
	this.mouse = new THREE.Vector2();

	this.INTERSECTED;
	this.interactionEvent = new EditorEvent();
	this.gridHelper;

	this.scene;
	this.renderer;
	this.transformControl; //TransformControll - Translate, Rotate and Scale
	this.controls; //OrbitControl for the Camera
	this.modifiable = false;
	this.mode = "select";
	
	this.objects = [ ];
	this.geometries = { };
	this.materials = { };
	this.helpers = { }; //Helper-list-obj to avoid syncing helpers
	// this.textures = {};//TODO
	// this.scripts = {};//TODO

	this.sessionID;
	this.selected = null; //Own selection - inital null	
	this.session = { }; //all users and their selections
};
Editor.prototype ={
	/*
	* Bind nessesary context to methods
	* Initallized and setup camera/renderer and start rendering
	*/
	init: function( ){

		this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 1000 );
		this.camera.name = 'UserCamera';
		this.camera.position.z = 250;
		this.camera.position.y = 150;
		this.camera.position.x = 100;
		this.camera.lookAt( new THREE.Vector3(0, 0, 0));

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor( 0xf0f0f0 );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.getElementById("canvas").appendChild(this.renderer.domElement);

		this.render = this.render.bind(this);
		this.createPrimitive = this.createPrimitive.bind(this);
		this.getSceneModel = this.getSceneModel.bind(this);
		this.select = this.select.bind(this);
		this.getSceneElementByUuid = this.getSceneElementByUuid.bind(this);


		document.getElementById("canvas").addEventListener('mousedown', this.mousedown.bind(this));
		document.getElementById("canvas").addEventListener('mouseup', this.mouseup.bind(this));

		var canvas = document.getElementById("canvas");
		this.controls = new THREE.OrbitControls( this.camera,  canvas);
		this.controls.damping = 0.2;
		this.controls.addEventListener( 'change', this.render.bind(this) );

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

		this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
		this.transformControl.addEventListener('change', this.controlChange.bind(this));
		this.transformControl.addEventListener('mouseDown', this.mousedown.bind(this));
		this.scene.add( this.transformControl );

		var size = 100;
		var step = 10;
		var gridHelper = new THREE.GridHelper( size, step );		
		this.scene.add( gridHelper );

		this.render();

	},
	/*
	* If user is a creator/inventor of a session
	*/
	createScene: function(){
		this.scene = new THREE.Scene();
		this.scene.name = 'Scene';
	},
	/*
	* If user join a session, sync scene from server
	*@param json formated scene
	*/
	setScenefromServer: function(sceneObj){
		var jsonObj = JSON.parse(JSON.stringify(sceneObj));
		var loader = new THREE.ObjectLoader();

		var scene = loader.parse(jsonObj);
		this.scene = scene;
		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;

		for (var i = 0; i < jsonObj.geometries.length; i++) {
			this.addGeometry(jsonObj.geometries[i]);
		};
		for (var i = 0; i < jsonObj.materials.length; i++) {
			this.addMaterial(jsonObj.materials[i]);		
		};
		scene.traverse( function ( child ) {		
			if ( child.type !== "Scene" ) {
				this.editor.objects.push(child);
			}	
		} );
	},
	//Handle resizing of the canvas element
	onWindowResize: function() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.render();
	},
	/*
	*Cast raycast to intersect with objects inside the scene
	*and check if objects are block by other users
	*@param x <number>
	*@param y <number>
	*return object.uuid<STRING> or null for blocked objects or no hit
	*/ 
	intersect: function( x, y ){
		//calculate mouse position in normalized device coordinates
		var x = x;
		var y = y;
		this.mouse.x = ( x / window.innerWidth ) * 2 - 1; 
		this.mouse.y = - ( y / window.innerHeight ) * 2 + 1;	


		this.raycaster.setFromCamera( this.mouse, this.camera );
		var intersects = this.raycaster.intersectObjects( this.objects, true );
		var selectable = true;

		//Hit on something
		if ( intersects.length > 0 ) {

			//Check selection uuid if it is blocked by another user 
			for (selectionID in this.session) {

				//Check uuid or parent uuid if its blocked by others
				if (this.session[selectionID]==intersects[ 0 ].object.uuid
					||this.session[selectionID]==intersects[ 0 ].object.parent.uuid) {

					//Other user try to select a block element without any selection befor
					if (this.selected!== null) {

						//if its blocked by the user themself
						if (intersects[ 0 ].object.uuid === this.selected.uuid
							|| intersects[ 0 ].object.parent.uuid === this.selected.uuid) {
							// console.log("Blocked by myself");
							return this.selected.uuid;
						}
						else{
							// console.log("Blocked by another user - with own selection");
							return this.selected.uuid;
							selectable = false;
						};
					}
					else{
						// console.log("Blocked by another user - NO own selection");
						selectable = false;
					};
					//TODO If there is an clickable object under the blocked one
					//return this object
				};
			};
			//If its selectable 
			if (selectable) {
				//direct 
				if (intersects[ 0 ].object.parent instanceof THREE.Scene) {
					return intersects[ 0 ].object.uuid
				}
				else{
				//parent	
					return intersects[ 0 ].object.parent.uuid
				};
			};
		}else{//no hit
			//console.log("Click on empty space");
			return null;
			
		}
	},
	/*
	*Handling mousedown events on canvas aka scene
	*Fires the custom interaction event on the first interaction (trans./rot./scale)
	*@param evt
	*/
	mousedown: function(evt){
		var x ,y;
		//collapse .menu-content
		$( document.activeElement).trigger( "blur" );

		x = evt.offsetX;
		y = evt.offsetY;
	
		//Checking for Objects
		var selection = this.intersect(x, y);
		//If selection mode
		if (this.mode=="select") {

			//Previews selection was made and no hit
			if (this.selected !== null && selection === null) {
				var helperObj = this.helpers[this.selected.id];
				this.removeHelper(helperObj);
				this.deselect();
				this.modifiable = false;
			}
			//NO previews selection was made and hit
			else if (this.selected === null&&selection!== null) {
				this.selectByUuid(selection);		
			}
			//Previews selection was made and hit 
			else if(this.selected!==null && selection !== null && this.selected.uuid !== selection){
				var helperObj = this.helpers[this.selected.id];
				this.removeHelper(helperObj);
				this.deselect();
				this.selectByUuid(selection);
				//this.modifiable = false;
			};	
		}
		//Else: mode = translate/rotate/scale
		else{ 
			this.modifiable = true;
			//New selection
			if (selection!== null&& selection!== this.selected.uuid) {
				this.deselect();
				this.selectByUuid(selection);
			}
			else{
				var data;
				switch ( this.mode ) {

					case "translate": 
						data = this.selected.position;
						break;

					case "rotate": 
						data = this.selected.rotation;
						break;

					case  "scale": 
						data = this.selected.scale;	
		                break;
				}//switch end
				this.interactionEvent.fire({
					type:"interaction", 
					interaction:"changeObj", 
					uuid: this.selected.uuid,
					vector3:data,
					matrix: this.selected.matrix.elements,
					mode: this.mode
				});
			};//Else ende
		};
	},
	/*
	*Handle change-events on the TransformControl gizmos
	*Fires the custom interaction event during the interaction (trans./rot./scale)
	*@param evt
	*/
	controlChange: function(evt){
		if (this.mode!=="select"&& this.modifiable ==true) {
			var data;
			//var mode = this.mode;
				switch ( this.mode ) {

					case "translate": 
						data = this.selected.position;
						break;

					case "rotate": //
						data = this.selected.rotation;
						var quar = this.selected.quaternion
						break;

					case  "scale": //
						data = this.selected.scale;
		                break;
				} // switch end

				this.interactionEvent.fire({
					type:"interaction", 
					interaction:"changeObj", 
					uuid: this.selected.uuid,
					vector3:data,
					matrix: this.selected.matrix.elements,
					mode: this.mode
				});
		};
		
	},
	/*
	*Handling mouseup events on canvas aka scene
	*Fires the custom interaction event on the last interaction (trans./rot./scale)
	*Fires event to update server-scene (setState)
	*@param evt
	*/
	mouseup: function(evt){
		var x = evt.offsetX;
		var y = evt.offsetY;
		if(this.modifiable == false){

			if (this.mode!=="select") {
				var selection = this.intersect(x, y);
				
				if (selection!== null && selection !== this.selected.uuid) {
					this.transformControl.detach(this.selected);
					this.deselect();
					this.selectByUuid(selection);
					this.mode = "select";
				}
				else if(selection === null){
					this.transformControl.detach(this.selected);
					this.deselect();
					this.mode = "select";
				};
			};	
		};
		if(this.modifiable == true){
			var data
			var mode = this.mode;
				switch ( mode ) {

					case "translate": 
						data = this.selected.position;
						break;

					case "rotate": //
						data = this.selected.rotation;
						break;

					case  "scale": //
						data = this.selected.scale;
		                break;
				}
			//finish interaction
			this.interactionEvent.fire({
				type:"interaction", 
				interaction:"changeObj", 
				uuid: this.selected.uuid,
				vector3:data,
				matrix: this.selected.matrix.elements,
				mode: this.mode
			});
			//set final state of the object on server scene
			this.interactionEvent.fire({
				type:"interaction", 
				interaction:"setState", 
				//uuid: this.selected.uuid,
				data:this.selected.geometry		
			});
			this.modifiable = false;
		}
	},
	/*
	*Get the scene with all clickable objects and the correspondings materials
	*return JSON formated Scene-object
	*/
	getSceneModel: function(){
		var geometries = [];
		var materials = [];
		var objects = [];
		for(objId in this.geometries){
			geometries.push;
		};
		for(objId in this.materials){
			materials.push;
		};
		for(objId in this.objects){
			objects.push;
		};
		var session = {
			"geometries": geometries,
			"materials": materials,
			"object": {
				"children": objects,
				"matrix": this.scene.matrix,
				"name": this.scene.name,
				"type": this.scene.type,
				"uuid": this.scene.uuid
			}
		};
		return JSON.parse(JSON.stringify(session));
	},
	/* 
	*Method to construct plain geometry
	*@param type (STRING)
	*/
	createPrimitive: function(type){
		switch(type){
			case "cube":
				var width = 60;
				var height = 60;
				var depth = 60;
				var widthSegments = 1;
				var heightSegments = 1;
				var depthSegments = 1;

				var geometry = new THREE.BoxGeometry( width, height, depth, widthSegments, heightSegments, depthSegments );
				var mat = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff/*, opacity: 0.5 */});
				var box = new THREE.Mesh( geometry, mat /* new THREE.MeshPhongMaterial() */ );
				//this.meshCount++;
				box.name = 'Box-Mesh';
				this.addObject( box, true );
				break;

			case "cylinder":
				var geometry = new THREE.CylinderGeometry( 5, 5, 20, 32 );
				var material = new THREE.MeshBasicMaterial( {color: Math.random() * 0xffffff} );
				var cylinder = new THREE.Mesh( geometry, material );
				cylinder.name = "Cylinder-Mesh"
				this.addObject( cylinder, true );
				break;

			case "torus":
				var geometry = new THREE.TorusGeometry( 10, 3, 16, 100 );
				var material = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } );
				var torus = new THREE.Mesh( geometry, material );
				this.addObject( torus, true );
				break;
		}
	},
	/*
	*Adding geometries to the Scene-Model
	*@param geometry (THREE.Geometry)
	*/
	addGeometry: function ( geometry ) {
		if (this.geometries[ geometry.uuid] == geometry.uuid ) {
			console.log("Error: Geometry trying to add allready existing");
			return;
		}
		else{
			this.geometries[ geometry.uuid ] = geometry;
		};
	},
	/*
	*Adding materials to the Scene-Model
	*@param material (THREE.Material)
	*/
	addMaterial: function ( material ) {
		if (this.materials[ material.uuid ]==material.uuid) {
			console.log("Error: Material trying to add allready existing");
			return;
		}
		else{
			this.materials[ material.uuid ] = material;
		};	
	},
	/*
	*Adding objects to the scene and Scene-Model
	*@param object (MESH)
	*@param emitable (BOOLEAN) - for synchronising with other users(= true)
	*/
	addObject: function ( object, emitable) {
		var scope = this;
		var obj = object;

		obj.traverse( function ( child ) {
			if ( child.geometry !== undefined ) {
				scope.addGeometry( child.geometry );
			}else if(child.children > 0) { 
				//console.log("Object has a child with geometry");
			};
			if ( child.material !== undefined ) {
				scope.addMaterial( child.material );
			}else{ 
				//console.log("Object trying to add has no Material");
			};
		} );
		this.scene.add( obj );
		this.objects.push(obj);
		if (emitable) {
			this.interactionEvent.fire({
				type:"interaction", 
				interaction:"addObj", 
				obj:obj
			});
		};
	},
	/*Remove a specific object from the scene
	*@param 
	*/
	removeObj: function(obj){

		var tmpObj;

		if (obj.parent.type !== "Scene") {
			tmpObj = this.getSceneElementByUuid(obj.uuid);		
		}
		else{ tmpObj = obj; };

		if (tmpObj !== null) {
			this.scene.remove( tmpObj );

			for (elem in this.objects) {
				if (this.objects[elem].id == tmpObj.id) {
					var pos = elem;
					this.objects.splice(pos, 1);

				};
			};
		};
	},
	/*
	*Set user selection 
	*fires selection sync event
	*@param object (THREE.Object3D)
	*/
	select: function ( object ) {

		if ( this.selected !== object ) {

			// if (this.selected!==null) {
			// 	var helperObj = this.helpers[this.selected.id];
			// 	this.removeHelper(helperObj);
			// };

			this.interactionEvent.fire({
				type:"interaction", 
				interaction:"select", 
				selectionUuid: object.uuid
			});

			this.selected = object;
			this.addHelper("select", object);
			this.session[this.sessionID] = this.selected.uuid;
		};	
	},
	/*
	*
	*
	*/
	selectByUuid: function ( uuid ) {
		var scope = this;
		this.scene.traverse( function ( child ) {
			if ( child.uuid === uuid ) {
				scope.select( child );
			}

		} );
	},
	/*
	*Get and element from scene by a given uuid
	*
	*NOTE: 	For now we only take objects into account wich are one the first 
	*		level of the Scene-graph/hierachy (parent must be Scene!)
	*
	*@param uuid<STRING>
	*return THREE.Object3D
	*/
	getSceneElementByUuid: function(uuid){
		var element;
		var backValue
		this.scene.traverse( function ( child ) {			
			if ( child.uuid === uuid ) {
				element = child;
			}
		} );
		//For now 
		//In case of Object 3D with serveral meshes
		if (element.parent.type!=="Scene") {
			backValue = this.getSceneElementByUuid(element.parent.uuid);
		}else{
			backValue = element;
		};
		return backValue;
	},
	/*
	*Deselect and fires deselect-interaction event
	*/
	deselect: function () {
		this.selected = null ;
		this.session[this.sessionID] = this.selected;

		this.interactionEvent.fire({
			type:"interaction", 
			interaction:"deselect"
		});
	},
	/*
	*Add BoundingBoxHelper obj as selection-feedback
	*@param typeString <STRING>
	*@param obj<THREE.Object3D>
	*/
	addHelper: function(typeString, obj){
		switch(typeString){
			case "select":
				var hex = 0xff0000;
				var bbox = new THREE.BoundingBoxHelper( obj, hex ); 
				this.helpers[ obj.id ] = bbox;

				bbox.update(); 
				this.scene.add( bbox );
				break;
		}

	},
	/*
	*Add transformcontrol to obj and set mode
	*@param opt<STRING>
	*/
	modifieSelection: function(opt){
		if (this.selected == null) return alert("Nothing selected to "+opt);
		//Remove BoundingBoxHelper from previews selection
		if (this.selected!==null) {
			var helperObj = this.helpers[this.selected.id];
			this.removeHelper(helperObj);
		};

		this.transformControl.attach( this.selected );
		if (opt == "translate") {
			this.mode = "translate";		
			this.transformControl.setMode( "translate" );
		};
		if (opt == "rotate") {
			this.mode = "rotate";
			this.transformControl.setMode( "rotate" );
		};
		if (opt == "scale") {
			this.mode = "scale";
			this.transformControl.setMode( "scale" );
		};
		if (opt == "select") {
			this.mode = "select";
			this.transformControl.detach(this.selected);
			this.addHelper(this.mode, this.selected);
		};
	},
	/*
	*Removes helper object from scene and helpers-list
	*or detach the TransfomrControl
	*@param helperObj
	*/
	removeHelper: function(helperObj){
		if (this.mode !=="select") {
			this.transformControl.detach(this.selected);
			this.mode = "select";
		}
		else if (this.mode == "select") {
			delete this.helpers[helperObj.object.id];
			this.scene.remove( helperObj);
		};
	},

	/*
	* Render loop
	*/
	render: function(){

		requestAnimationFrame( this.render);
		this.renderer.render(this.scene, this.camera); 
	}
};
