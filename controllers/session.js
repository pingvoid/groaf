/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/

/*
*Controller module to handle the IO inside a sessions
*/
module.exports = {
    //Websocket-connetion established call after window.onload
    //To initiallized the client as inventor or guest
    ready:function(req){
        var sessionName = req.data.con_data.sessionName;
        var param = req.data.con_data.urlType;

        if (GLOBAL.sessions[sessionName]) {

            if(param=="create" && GLOBAL.sessions[sessionName].live== false){
                //start client as inventor
                req.io.emit("inventor",{sessionID: req.socket.id});
                //create room with the name of the session
                req.io.join(sessionName);
                //put user in the selection list(aka userlist)
                GLOBAL.sessions[sessionName].activeSelections[req.socket.id] = null;
            };
            //TODO Inventor reconnect how to handle it better
            if(param=="create" && GLOBAL.sessions[sessionName].live== true){
                //req.io.emit("guest");             
            };

            if(param=="join" && GLOBAL.sessions[sessionName].live== true){
                //Set id to server side selection list
                GLOBAL.sessions[sessionName].activeSelections[req.socket.id] = null;
                //emit the session
                req.io.emit("sync",{
                    sessionID: req.socket.id,
                    scene: GLOBAL.sessions[sessionName].scene,
                    activeSelections:GLOBAL.sessions[sessionName].activeSelections
                });

                //Join room
                req.io.join(sessionName);
                //Update activeSelection list on client side
                req.io.room(sessionName).broadcast("selectionsChange", {
                    option:"add",
                    selectionID: req.socket.id
                });
            };
            if(param=="join" && GLOBAL.sessions[sessionName].live== false){
                console.log("User tried to join a non live session");
            };
        }
        else{
            console.log("Ready-event from a not existing session");
        };
    },
    //Inventor set session scene
    setServerScene: function(req){

        var sessionName = req.data.con_data.sessionName;
       
        if (GLOBAL.sessions[sessionName]) {
            GLOBAL.sessions[sessionName].scene = req.data.scene;

            if (GLOBAL.sessions[sessionName].scene.object.children == undefined) {
                GLOBAL.sessions[sessionName].scene.object.children = [];
            };
            if (GLOBAL.sessions[sessionName].scene.geometries== undefined) {
                GLOBAL.sessions[sessionName].scene.geometries =[];
            };
            if (GLOBAL.sessions[sessionName].scene.materials == undefined) {
                GLOBAL.sessions[sessionName].scene.materials = [];
            };
        };
         GLOBAL.sessions[sessionName].live = true;
    },
    //Handling all changes on the scene(add/change/remove)
    changeScene: function(req) {
        var data;
        var opt = req.data.option;
        var sessionName = req.data.con_data.sessionName;

        //  Check if session == true
        if(GLOBAL.sessions[sessionName]) {
            if (opt == "add") {
                //Broadcast the new added mesh to all clients in the room except for the current one.  
                req.io.room(sessionName).broadcast("sceneChange", {mesh:req.data.mesh, option:opt});

                var geo = req.data.mesh.geometries,
                    mat = req.data.mesh.materials,
                    obj = req.data.mesh.object,
                    sessID = req.socket.id,
                    i;
                //Add geometrie, 
                for (i = 0; i < geo.length; i++) {
                    GLOBAL.sessions[sessionName].scene.geometries.push(geo[i]);
                };
                //material
                for (i = 0; i < mat.length; i++) {
                    GLOBAL.sessions[sessionName].scene.materials.push(mat[i]);
                };
                //and corresponding object to server scene
                GLOBAL.sessions[sessionName].scene.object.children.push(obj);

            };
            if (opt == "change") {
                var vector = req.data.vector3;
                var uuid =  req.data.uuid;
                var mode = req.data.mode;
                //converting json obj to array
                var matrix = Object.keys(req.data.matrix).map(function(k) { return req.data.matrix[k] });
       
                for (var i = 0; i <= GLOBAL.sessions[sessionName].scene.object.children.length; i++) {
                    //checking for the wired undefined position inside the children-array from the scene
                    //and for the corresponding object to change via uuid
                    if (typeof GLOBAL.sessions[sessionName].scene.object.children[i] == "object"&&
                        GLOBAL.sessions[sessionName].scene.object.children[i].uuid == uuid) {

                        GLOBAL.sessions[sessionName].scene.object.children[i].matrix = matrix;
                    };
                }; 
                /*TODO
                *Take Vector and add to matrix 
                *depending on modification-mode
                */
                req.io.room(sessionName).broadcast("sceneChange", {mode: mode, vector:vector, uuid:uuid, option:opt});
            };
            if (opt == "remove") {
                data = req.data.uuid;
                var geo;
                var mat;
                // Get the object from Server Scene
                for (var i = 0; i < GLOBAL.sessions[sessionName].scene.object.children.length; i++) {

                    var tmpUuid=GLOBAL.sessions[sessionName].scene.object.children[i].uuid;

                    if (data == tmpUuid) {
                        //Get uuid´s of the geometry and material
                        geo = GLOBAL.sessions[sessionName].scene.object.children[i].geometry;
                        mat = GLOBAL.sessions[sessionName].scene.object.children[i].material;
                        //remove geomety from server session
                        for (var j = 0; j < GLOBAL.sessions[sessionName].scene.geometries.length; j++) {
                            if(geo == GLOBAL.sessions[sessionName].scene.geometries[j].uuid){
                                GLOBAL.sessions[sessionName].scene.geometries.splice(j, 1);
                            };
                        };
                        //remove materials from server session
                        for (var k = 0; k < GLOBAL.sessions[sessionName].scene.materials.length; k++) {
                            if(mat == GLOBAL.sessions[sessionName].scene.materials[k].uuid){
                                GLOBAL.sessions[sessionName].scene.materials.splice(k, 1);
                            };
                        };
                        GLOBAL.sessions[sessionName].scene.object.children.splice(i, 1);
                    };
                };// for (object.children) END
                req.io.room(sessionName).broadcast("sceneChange", {uuid:data, option:opt});
            };// if (opt == "remove") END
        };//if(GLOBAL.sessions[sessionName]) END
    },
    //Updating and synchronising userselection
    changeSelection: function(req){
        var sessName = req.data.con_data.sessionName;
        var uuid = req.data.selUuid;

        GLOBAL.sessions[sessName].activeSelections[req.socket.id] = uuid;

        req.io.room(sessName).broadcast("selectionsChange", {
            option:"change",
            selectionID: req.socket.id,
            uuid: uuid
        });
    }
};
