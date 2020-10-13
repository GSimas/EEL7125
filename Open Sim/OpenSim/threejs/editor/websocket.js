/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var wsUri = "ws://" + document.location.host + "/visEndpoint";
var websocket = new WebSocket(wsUri);

var processing = false;
var last_message_uuid = 0;
websocket.onerror = function(evt) { onError(evt) };

function onError(evt) {

}

websocket.onopen = function(evt) { onOpen(evt) };

function writeToScreen(message) {

};

function onOpen() {

}
websocket.onmessage = function(evt) { onMessage(evt) };

function sendText(json) {
	//console.log("sending text: " + json);
	websocket.send(json);
}
				
function onMessage(evt) {
	//console.log("received: " + evt.data);
	msg = JSON.parse(evt.data);

	switch(msg.Op){
	case "Select":
		editor.selectByUuid( msg.UUID);
		break;
	case "Deselect":
		editor.deselect();
		break;
	case "Frame":  
		if (processing)
			return;
		if (msg.message_uuid === last_message_uuid)
			return;
		last_message_uuid = msg.message_uuid;
		//console.log("frame timestamp: " + msg.time);
		processing = true;
		var t0 = performance.now();
		// Make sure nothing is selected before applying Frame
		editor.select( null);
		var transforms = msg.Transforms;
		for (var i = 0; i < transforms.length; i ++ ) {
			var oneBodyTransform = transforms[i];
			var o = editor.objectByUuid( oneBodyTransform.uuid);
			//alert("mat before: " + o.matrix);
			if (o != undefined) {
				o.matrixAutoUpdate = false;
				o.matrix.fromArray(oneBodyTransform.matrix);
			}
		}
		var paths = msg.paths;
		if (paths !== undefined){
			for (var p=0; p < paths.length; p++ ) {
				editor.updatePath(paths[p]);
			}
		}
		if (msg.render===true) // not undefined
			editor.refresh();
		var t1 = performance.now() - t0;
		//console.log("frame time: " + t1);
		processing = false;
		break;
	case "CloseModel":
		modeluuid = msg.UUID;
		editor.closeModel(modeluuid);
		editor.refresh();
		break;
	case "OpenModel":
		modeluuid = msg.UUID;
		if (editor.models.indexOf(modeluuid)===-1){
			editor.loadModel(modeluuid.substring(0,8)+'.json');
			editor.refresh();
		}
		break;
	case "SetCurrentModel":
		modeluuid = msg.UUID;
		editor.setCurrentModel(modeluuid);
		editor.refresh();
		break;
	case "execute":
		//msg.command.object = editor.objectByUuid(msg.UUID);
		if (msg.message_uuid !== last_message_uuid){
			cmd = new window[msg.command.type]();
			cmd.fromJSON(msg.command);
			editor.execute(cmd);
			editor.refresh();
			last_message_uuid = msg.message_uuid;
		}
		break; 
	case "addModelObject":
		cmd = new window[msg.command.type]();
		cmd.fromJSON(msg.command);
		parentUuid = msg.command.object.object.parent;
		editor.execute(cmd);
		newUuid = cmd.object.uuid;
        editor.moveObject(editor.objectByUuid(newUuid), editor.objectByUuid(parentUuid));
        if (msg.command.bbox !== undefined) {
            // update models bounding box with bbox;
            editor.updateModelBBox(msg.command.bbox);
        }
		editor.refresh();
		break;
	case "ReplaceGeometry":
		editor.replaceGeometry(msg.geometries, msg.uuid);
		break;
	case "PathOperation":
		if (msg.message_uuid !== last_message_uuid){
			editor.processPathEdit(msg);
			last_message_uuid = msg.message_uuid;
		}
		break;
	case "TogglePathPoints":
		editor.togglePathPoints(msg.uuid, msg.newState);
		break;
	case "scaleGeometry":
		editor.scaleGeometry(msg);
		break;
	case "startAnimation":
        editor.reportframeTime=true;
		break;
	case "endAnimation":
		// Sending any messages during handling a message causes problems, use callbacks only
		break;
	case "getOffsets":
		sendText(editor.getModelOffsetsJson());
		break;
    }
    processing = false; // Defensive in case render never finishes/errors
}
// End test functions
