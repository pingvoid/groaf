module.exports = function(req, res) {

    //Take the parameters out of the request
    var sessionName = req.params.groaf_pin;
    var reqtype = req.params.reqtype;

    //TODO Checking for correct string e.g. null, etc
    if (sessionName) {
        //checking session name for a join request
        if (GLOBAL.sessions[sessionName] && reqtype=="join" ) {

            res.sendfile('public/session/index.html');

        } else if (reqtype=="join") {
            res.send("There is no session with this name");
        }
        //checking for allready existing session ids on create request
        if (GLOBAL.sessions[sessionName] && reqtype=="create") {
            res.send("Session name allready in use, try another");
            
        } else if(reqtype=="create"){

            res.sendfile('public/session/index.html',{creator: true});
            GLOBAL.sessions[sessionName] = {live: false};
            console.log("Set session live...done");
            GLOBAL.sessions[sessionName].activeSelections = {};
        }
    } else {
        res.send("No sessionName recieved");
    }
};
