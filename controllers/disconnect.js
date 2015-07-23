var _ = require('underscore');

module.exports = function(req) {
    
    function removeUser(userID){
        //Checking through the sessions
        _.each(GLOBAL.sessions, function (session, sessionName) {
            //Checking through the activeSelections aka userlist
            _.each(session.activeSelections, function (data, id) {
                
                if (id == userID) {              
                    delete session.activeSelections[userID];
                    //Broadcast to all clients in the room.
                    req.io.room(sessionName).broadcast("selectionsChange", {
                        option:"remove",
                        selectionID: userID
                    });
                }
            })
        });
    };
    console.log("DISCONNECT", req.socket.id);
    removeUser(req.socket.id);
};
