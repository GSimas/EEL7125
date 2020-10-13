/**
 * @author mrdoob / http://mrdoob.com/
 */

var OpenSimToolbar = function ( editor ) {

	var signals = editor.signals;

	var container = new UI.Panel();
	//container.setPaddingTop('10px');
    // This causes 3 columns of buttons:
	container.dom.style.width = '120px';
	container.setId( 'opensim_toolbar' );

	var buttons = new UI.Panel();
	container.add( buttons );

	var camera = editor.camera;
    // +X
	var viewx = new UI.Button(false, 'icons/frontView_axes.png').onClick(function () {

	    viewfromPlusX();

	});
	viewx.dom.title = '-X';
	buttons.add(viewx);
	function viewfromPlusX() {
	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    //var helper = new THREE.BoundingBoxHelper(modelObject, 0xff0000);
	    //helper.update();
	    // If you want a visible bounding box
	    //editor.scene.add(helper);
	    // create a sphere at new CameraPos
	    var newpos = new THREE.Vector3().copy(center);
	    var fov = editor.camera.fov * (Math.PI / 180);
	    // Calculate the camera distance
	    var objectSize = Math.max(bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z) / 2;
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    newpos.x = bbox.max.x + distance;
	    editor.updateCamera(newpos, center);
	    
    };
    // +Y
	var viewplusy = new UI.Button(false, 'icons/topView_axes.png').onClick(function () {
	    viewfromPlusY();
	});
	viewplusy.dom.title = '-Y';
	buttons.add(viewplusy);
	function viewfromPlusY() {
	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    var newpos = new THREE.Vector3().copy(center);
	    var fov = editor.camera.fov * (Math.PI / 180);
	    // Calculate the camera distance
	    var objectSize = Math.max(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z) / 2;
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    newpos.y = bbox.max.y + distance;
	    editor.updateCamera(newpos, center);
	    
    };
    // +Z
	var viewplusz = new UI.Button(false, 'icons/rightView_axes.png').onClick(function () {
	    viewfromPlusZ();
	});
	viewplusz.dom.title = '-Z';
	buttons.add(viewplusz);
	function viewfromPlusZ() {

	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    var newpos = new THREE.Vector3().copy(center);
	    var fov = editor.camera.fov * (Math.PI / 180);
	    // Calculate the camera distance
	    var objectSize = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y)/2;
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    newpos.z = bbox.max.z + distance;
	    editor.updateCamera(newpos, center);
	    
    };
    // -X
	var viewminx = new UI.Button(false, 'icons/backView_axes.png').onClick(function () {
		viewfromMinusX();
	});
	viewminx.dom.title = '+X';
	buttons.add(viewminx);
	function viewfromMinusX() {
	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    var newpos = new THREE.Vector3().copy(center);
	    var fov = editor.camera.fov * (Math.PI / 180);
	    // Calculate the camera distance
	    var objectSize = Math.max(bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z) / 2;
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    newpos.x = bbox.min.x - distance;
	    editor.updateCamera(newpos, center);
	    
    };
    // -Y
	var viewminy = new UI.Button(false, 'icons/bottomView_axes.png').onClick(function () {
	    viewfromMinusY();
	});
	viewminy.dom.title = '+Y';
	buttons.add(viewminy);
	function viewfromMinusY() {
	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    var newpos = new THREE.Vector3().copy(center);
	    var fov = editor.camera.fov * (Math.PI / 180);
	    // Calculate the camera distance
	    var objectSize = Math.max(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z) / 2;
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    newpos.y = bbox.min.y - distance;
	    editor.updateCamera(newpos, center);
	    
    };
    // -Z
	var viewminz = new UI.Button(false, 'icons/leftView_axes.png').onClick(function () {
	    viewfromMinusZ();
	});
	viewminz.dom.title = '+Z';
	buttons.add(viewminz);
	function viewfromMinusZ() {

	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    var newpos = new THREE.Vector3().copy(center);
	    var fov = editor.camera.fov * (Math.PI / 180);
	    // Calculate the camera distance
	    var objectSize = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y)/2;
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    newpos.z = bbox.min.z - distance;
	    editor.updateCamera(newpos, center);
	    
	};

	var view_zoomout = new UI.Button(false, 'icons/zoom-out.png').onClick(function () {
	    editor.viewZoom(-100);
	});
	view_zoomout.dom.title = 'Zoom-out';
	buttons.add(view_zoomout);
	var view_zoomin = new UI.Button(false, 'icons/zoom-in.png').onClick(function () {
	    editor.viewZoom(+100);
	});
	view_zoomin.dom.title = 'Zoom-in';
	buttons.add(view_zoomin);
	var view_refit = new UI.Button(false, 'icons/refit.png').onClick(function () {
	    //var modelObject = editor.scene.getObjectByName('OpenSimModel');
	    var bbox = computeModelBbox();
	    var center = new THREE.Vector3();
	    bbox.center(center);
	    //var newpos = new THREE.Vector3().copy(camera.location);
	    var fov = camera.fov * (Math.PI / 180);
	    var objectSize = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
	    var distance = Math.abs(objectSize / Math.sin(fov / 2));
	    //var helper = new THREE.BoundingBoxHelper(modelObject, 0xff0000);
	    //helper.update();
	    //editor.scene.add(helper);
	    // Zoom out only if model is outside view, also zoom in if too small
	    var curDistance = center.distanceTo(camera.position);
	    editor.viewZoom(curDistance - distance);
	    

	});
	view_refit.dom.title = 'Fit model(s) in visualizer window using current camera orientation';
	buttons.add(view_refit);

	var snapshot = new UI.Button(false, 'icons/camera.png').onClick(function () {
            saveAsImage();
	});
	snapshot.dom.title = 'Snapshot';
	buttons.add(snapshot);

	function computeModelBbox() {
	    var modelObject = editor.getModel();
	    return (new THREE.Box3().setFromObject(modelObject));
	};
	function saveAsImage() {
		editor.signals.hiresRender.dispatch();
	};
	var recordButton = new UI.Button(false, 'icons/video.png');
	var recordStatus = false;
	recordButton.onClick(function () {
		recordStatus = !recordStatus;
		if (recordStatus) // Dark red if recording, should be done in CSS
			recordButton.dom.style.backgroundColor = "#FF0808";
		else // default
			recordButton.dom.style.backgroundColor = "";
		toggleRecord();

	});
	recordButton.dom.title = 'Record Start/Stop';
	buttons.add(recordButton);
	function toggleRecord() {
            editor.toggleRecord();
    }
	var globalFrameButton = new UI.Button(false, 'icons/axes.png');
	globalFrameButton.dom.title = 'Global Frame X(Red), Y(Green) Z(Blue)';
	globalFrameButton.onClick(function () {
		editor.toggleGlobalFrame();
	});
	buttons.add(globalFrameButton);
	return container;
}
