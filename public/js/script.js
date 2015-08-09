/**
* Groaf - Colloborativ 3D-WebGL Editor
* author: Hendrik Wernze
* mail: hwernze@gmail.com
**/
$(document).ready(function() {
	//matching against the regex returns the string if it is ok, 
	//or null if its invalid!
	var allowedSigns =/^[\w_]*$/;
	//Allow submit
	var valid = false;

	//Create submit
	$("#create").click(function(){
		if (valid) {
			var pin = $("#groaf_pin").val();
			window.location.pathname = "/session/"+pin+ '&create';
		};
	});
	//Join submit
	$("#join").click(function(){
		if (valid) {
			var pin = $("#groaf_pin").val();
			window.location.pathname = "/session/"+pin+ '&join';
		};
	});
	//String check
	$("#groaf_pin").keyup(function() {
		var inputString = $("#groaf_pin").val();

		if (inputString.length===0) {
			valid = false;
			$("#hint").css("display", "none");
		};

		if (inputString.match(allowedSigns) !== null) {
			//&&inputString.length<0
			valid = true;
			$("#hint").css("display", "none");
		}
		else{
			valid = false;
			$("#hint").css("display", "inline-block");
		};
	  	
	});

});
