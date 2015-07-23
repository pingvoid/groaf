/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/

///////////////////////////////
// Config
///////////////////////////////
var express = require('express.io'),
    app = express(),
    path = require('path'),
    fs = require('fs'),
    sessionController = require('./controllers/session'),
    disconnectController = require('./controllers/disconnect'),
    initContoller = require('./controllers/init');

// Init global sessions object for runtime persistence
GLOBAL.sessions = {};
app.http().io();

// Make public folder accessible
app.use(express.static(path.join(__dirname, 'public')));

///////////////////////////////
// Routes
///////////////////////////////

// Send the editorclient html 
app.get('/session/:groaf_pin&:reqtype', initContoller);
app.io.route('session', sessionController);
app.io.route('disconnect', disconnectController);

// Start listening
app.listen(3000, function(){
    console.log("**************************");
    console.log("**************************");
    console.log("*     START SERVER       *");
    console.log("**************************");
    console.log("**************************");
    console.log('listening on *:3000');
});
