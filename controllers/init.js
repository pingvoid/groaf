/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/

/*
*Controller module to handle the inital requerst from the 
*landing page aka login-page
*/
module.exports = function(req, res) {
    var sessionName = req.params.groaf_pin;
    var reqtype = req.params.reqtype;

    if (sessionName) {
        //checking session name for a join request
        if (GLOBAL.sessions[sessionName] && reqtype=="join") { //TODO better regEx pattern

            res.sendfile('public/session/index.html');
        } 
        else if (reqtype=="join") {
            res.send("There is no session with this name");
        }
        //checking for allready existing session ids on create request
        if (GLOBAL.sessions[sessionName] && reqtype=="create") {
            res.send("Session name allready in use, try another");
            
        } else if(reqtype=="create"){
            res.sendfile('public/session/index.html',{creator: true});
            GLOBAL.sessions[sessionName] = {live: false};
            GLOBAL.sessions[sessionName].activeSelections = {};
        }
    } 
    else {
        res.send("No sessionName recieved <br> or string contains whitespaces");
    }
};
