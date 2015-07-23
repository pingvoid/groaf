module.exports = {

    ready:function(req){

        var sessionName = req.data.con_data.sessionName;
        var param = req.data.con_data.urlType;

        //
        if (GLOBAL.sessions[sessionName]) {

            if(param=="create" && GLOBAL.sessions[sessionName].live== false){

                req.io.emit("inventor",{sessionID: req.socket.id});
                req.io.join(sessionName);

                GLOBAL.sessions[sessionName].activeSelections[req.socket.id] = null;
                console.log("+-+-+-+-+-+ NEW SESSION +-+-+-+-+-+");
                console.log(GLOBAL.sessions[sessionName]);
                console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+");

            }
            //Inventor reconnect?
            if(param=="create" && GLOBAL.sessions[sessionName].live== true){
                //req.io.emit("guest");             
            }

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

            }

            if(param=="join" && GLOBAL.sessions[sessionName].live== false){

                console.log("User tried to join a non live session");

            }
        }else{
            console.log("Ready-event from a not existing session");
        }
    },
    setServerScene: function(req){

        var sessionName = req.data.con_data.sessionName;
       

        if (GLOBAL.sessions[sessionName]) {
            GLOBAL.sessions[sessionName].scene = req.data.scene;
            

            if (GLOBAL.sessions[sessionName].scene.object.children == undefined) {
                //console.log("Scene children undefined");
                GLOBAL.sessions[sessionName].scene.object.children = [];
            };
            if (GLOBAL.sessions[sessionName].scene.geometries== undefined) {
                //console.log("Scene geometries undefined");
                GLOBAL.sessions[sessionName].scene.geometries =[];
            };
            if (GLOBAL.sessions[sessionName].scene.materials == undefined) {
                //console.log("Scene materials undefined");
                GLOBAL.sessions[sessionName].scene.materials = [];
            };
            console.log("--> Session Scene set to:");
            console.log(GLOBAL.sessions[sessionName].scene);
        };
         GLOBAL.sessions[sessionName].live = true;
    },
    //ex addObj
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
                    console.log("Add geometrie "+ i +" of " + geo.length);
                    console.log(geo[i]);
                }
                //material
                for (i = 0; i < mat.length; i++) {
                    GLOBAL.sessions[sessionName].scene.materials.push(mat[i]);
                    console.log("Add material "+ i +" of " + mat.length);
                    console.log(mat[i]);
                }
                //and corresponding object to server scene
                GLOBAL.sessions[sessionName].scene.object.children.push(obj);
                console.log("Add Object aka Mesh");
                console.log(GLOBAL.sessions[sessionName].scene.object.children);
                console.log("+-+-+-+-+-+ SESSION.scene after add +-+-+-+-+-+");
                console.log(GLOBAL.sessions[sessionName].scene);
                console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+");
                console.log(GLOBAL.sessions[sessionName].scene.object.children);


                // if (GLOBAL.sessions[sessionName].scene.object.children[0].children.length>0) {
                //     console.log("Hello Worldadasdasdasdasdasdasdasdasd");
                //     var counter = GLOBAL.sessions[sessionName].scene.object.children[0].children.length;
                //     for (var i = 0; i < counter; i++) {
                //         console.log("Mesh children number:" + i);
                //         console.log(GLOBAL.sessions[sessionName].scene.object.children[0].children[i]);
                //     };
                // };

                //Set user selection to the new added Object
                //GLOBAL.sessions[sessionName].activeSelections[sessID] = obj.uuid;

            }// if (opt == "add") END
            if (opt == "change") {
                var vector = req.data.vector3;
                var uuid =  req.data.uuid;
                var mode = req.data.mode;
                //converting json obj to array
                var matrix = Object.keys(req.data.matrix).map(function(k) { return req.data.matrix[k] });

                
                for (var i = 0; i <= GLOBAL.sessions[sessionName].scene.object.children.length; i++) {
                    console.log("Checking child: " + i);
                    console.log(typeof GLOBAL.sessions[sessionName].scene.object.children[i]);

                    //checking for the wired undefined position inside the children-array from the scene
                    //and for the corresponding object to change via uuid
                    if (typeof GLOBAL.sessions[sessionName].scene.object.children[i] == "object"&&
                        GLOBAL.sessions[sessionName].scene.object.children[i].uuid == uuid) {

                        GLOBAL.sessions[sessionName].scene.object.children[i].matrix = matrix;
                        console.log("Update the matrix....done!");
                        //console.log(GLOBAL.sessions[sessionName].scene.object.children);
                      
                    };
                };
                
                //TODO
                /*
                *Take Vector and add to matrix 
                *depending on modification-mode
                */

                req.io.room(sessionName).broadcast("sceneChange", {mode: mode, vector:vector, uuid:uuid, option:opt});
            }

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

                        for (var j = 0; j < GLOBAL.sessions[sessionName].scene.geometries.length; j++) {
                            if(geo == GLOBAL.sessions[sessionName].scene.geometries[j].uuid){
                                console.log("DELETE");
                                console.log(GLOBAL.sessions[sessionName].scene.geometries[j]);
                                GLOBAL.sessions[sessionName].scene.geometries.splice(j, 1);
                            }
                        }// for(geometries) END

                        for (var k = 0; k < GLOBAL.sessions[sessionName].scene.materials.length; k++) {
                            if(mat == GLOBAL.sessions[sessionName].scene.materials[k].uuid){
                                console.log("DELETE");
                                console.log(GLOBAL.sessions[sessionName].scene.materials[k]);
                                GLOBAL.sessions[sessionName].scene.materials.splice(k, 1);
                            }
                        }// for( materials ) END
                        GLOBAL.sessions[sessionName].scene.object.children.splice(i, 1);
                    }// If ( uuid ) END

                }// for (object.children) END
                req.io.room(sessionName).broadcast("sceneChange", {uuid:data, option:opt});

            }// if (opt == "remove") END


            // if (opt == "change") {
            //     req.io.room(sessionName).broadcast("sceneChange", tmpMesh, tmpOption);
            // }; 


        }//if(GLOBAL.sessions[sessionName]) END

    },
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
