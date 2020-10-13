/**
 * @author mrdoob / http://mrdoob.com/
 */

var OpenSimEditor = function () {

	this.DEFAULT_CAMERA = new THREE.PerspectiveCamera( 50, 1, 0.1, 10000 );
	this.DEFAULT_CAMERA.name = 'Camera';
	this.DEFAULT_CAMERA.position.set( 20, 10, 20 );
	this.DEFAULT_CAMERA.lookAt( new THREE.Vector3() );
	this.dolly_camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
	this.dolly_camera.name = 'DollyCamera';
	this.dolly_camera.position.set(0, 0, 0);
	this.dolly_camera.lookAt(new THREE.Vector3());

	this.dolly_object = new THREE.Object3D();
	this.dolly_object.name = 'Dolly';
	this.dolly_object.position.y = 0;
	this.recording = false;
	// Container for all the lights, geometry, floor that are part of the scene
	this.environment = undefined;
	this.models = [];
	this.currentModel = undefined; //uuid of current model call getCurrentModel for actualobject
	this.currentModelColor = new THREE.Color(0xffffff);
	this.nonCurrentModelColor = new THREE.Color(0x888888);
	this.onlyCurrentModelCastsShadow = false;
	this.sceneBoundingBox = undefined;
	this.sceneLight = undefined;
	this.modelLightIntensity = 0.25;
	this.globalFrameGroup = undefined;
	this.cache = Object.create(null);
	// types of objects that are graphically movable
	var supportedOpenSimTypes = ["PathPoint", "Marker"];
    this.reportframeTime = false;
	//this.cameraEye = new THREE.Mesh(new THREE.SphereGeometry(50), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
	//this.cameraEye.name = 'CameraEye';

	var Signal = signals.Signal;

	this.signals = {

		// script

		editScript: new Signal(),

		// player

		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		// actions

		showModal: new Signal(),

		// notifications

		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		themeChanged: new Signal(),
		backgroundColorChanged: new Signal(),
		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererChanged: new Signal(),

		sceneGraphChanged: new Signal(),

		cameraChanged: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		objectFocused: new Signal(),

		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialChanged: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		fogTypeChanged: new Signal(),
		fogColorChanged: new Signal(),
		fogParametersChanged: new Signal(),
		windowResize: new Signal(),

		showGridChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		historyChanged: new Signal(),
		refreshScriptEditor: new Signal(),

		renderDebugChanged: new Signal(),
		animationStarted: new Signal(),
		animationStopped: new Signal(),
		defaultCameraApplied: new Signal(),
		recordingStarted: new Signal(),
		recordingStopped: new Signal(),
		hiresRender: new Signal(),
		screenCaptureScaleupChanged: new Signal(),
		captureFrame: new Signal(),
	};

	this.config = new Config( 'threejs-editor' );
	this.history = new History( this );
	this.storage = new Storage();
	this.loader = new THREE.OpenSimLoader(this);

	this.camera = this.DEFAULT_CAMERA.clone();
	this.dollyPath = new THREE.ClosedSplineCurve3([
			new THREE.Vector3(0, 0, 2000),
			new THREE.Vector3(-1400, 0, 1400),
			new THREE.Vector3(-2000, 0, 0),
			new THREE.Vector3(-1400, 0, -1400),
			new THREE.Vector3(0, 0, -2000),
			new THREE.Vector3(1400, 0, -1400),
			new THREE.Vector3(2000, 0, 0),
			new THREE.Vector3(1400, 0, 1400),
	]);

	this.dollyPath.type = 'catmullrom';
	this.scene = new THREE.Scene();
		// Ortho Scene and Camera for Logo and text
		this.sceneOrtho = new THREE.Scene();
		this.sceneOrthoCam = new THREE.OrthographicCamera( 0, window.innerWidth, window.innerHeight, 0, - 10, 10 );

	this.scene.userData = "NonEditable";

	this.scene.name = 'Scene';

	this.sceneHelpers = new THREE.Scene();

	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	this.selected = null;
	this.helpers = {};
	
	this.groundPlane = null;
	this.groundMaterial = null;
	this.modelsGroup = undefined;

	this.createEnvironment();
	this.createLights();
	this.createBackground(this.config.getKey('skybox'));
	this.createGroundPlane(this.config.getKey('floor'));
	this.createWall();
	this.createGlobalFrame();
	this.createDollyPath();
	this.createModelsGroup();
	this.createLogoSprite();

};

OpenSimEditor.prototype = {

	setTheme: function ( value ) {

		document.getElementById( 'theme' ).href = value;

		this.signals.themeChanged.dispatch( value );

	},

	//

	setScene: function ( scene ) {

		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;
		this.scene.userData = JSON.parse( JSON.stringify( scene.userData ) );

		// avoid render per object

		this.signals.sceneGraphChanged.active = false;

		while ( scene.children.length > 0 ) {

			this.addObject( scene.children[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

	},

	//

	addObject: function ( object ) {

		var scope = this;

		object.traverse( function ( child ) {

			if ( child.geometry !== undefined ) scope.addGeometry( child.geometry );
			if ( child.material !== undefined ) scope.addMaterial( child.material );

			scope.addHelper( child );

		} );
		if (object.parent !== null && object.parent !== undefined)
			object.parent.add(object);
		else
			this.scene.add( object );

		this.signals.objectAdded.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},

	moveObject: function ( object, parent, before ) {

		if ( parent === undefined ) {
			console.log('parent not found, using scene');
			parent = this.scene;

		}

		parent.add( object );

		// sort children array

		if ( before !== undefined ) {

			var index = parent.children.indexOf( before );
			parent.children.splice( index, 0, object );
			parent.children.pop();

		}

		this.signals.sceneGraphChanged.dispatch();

	},

	nameObject: function ( object, name ) {

		object.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	removeObject: function ( object ) {

		if ( object.parent === null ) return; // avoid deleting the camera or scene

		var scope = this;

		object.traverse( function ( child ) {

			scope.removeHelper( child );

		} );

		object.parent.remove( object );
		this.cache[object.uuid] = undefined;
		this.signals.objectRemoved.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},

	addGeometry: function ( geometry ) {

		this.geometries[ geometry.uuid ] = geometry;

	},

	setGeometryName: function ( geometry, name ) {

		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addMaterial: function ( material ) {

		this.materials[ material.uuid ] = material;

	},

	setMaterialName: function ( material, name ) {

		material.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addTexture: function ( texture ) {

		this.textures[ texture.uuid ] = texture;

	},

	//

	addHelper: function () {

		var geometry = new THREE.SphereBufferGeometry( 2, 4, 2 );
		var material = new THREE.MeshBasicMaterial( { color: 0xff0000, visible: false } );

		return function ( object ) {

			var helper;

			if ( object instanceof THREE.Camera ) {

				helper = new THREE.CameraHelper( object, 1 );

			} else if ( object instanceof THREE.PointLight ) {

				helper = new THREE.PointLightHelper( object, 1 );

			} else if ( object instanceof THREE.DirectionalLight ) {

				// helper = new THREE.DirectionalLightHelper( object, 1 );
				return;

			} else if ( object instanceof THREE.SpotLight ) {

				helper = new THREE.SpotLightHelper( object, 1 );

			} else if ( object instanceof THREE.HemisphereLight ) {

				helper = new THREE.HemisphereLightHelper( object, 1 );

			} else if ( object instanceof THREE.SkinnedMesh ) {

				helper = new THREE.SkeletonHelper( object );

			} else {

				// no helper for this object type
				return;

			}

			var picker = new THREE.Mesh( geometry, material );
			picker.name = 'picker';
			picker.userData.object = object;
			helper.add( picker );

			this.sceneHelpers.add( helper );
			this.helpers[ object.id ] = helper;

			this.signals.helperAdded.dispatch( helper );

		};

	}(),

	removeHelper: function ( object ) {

		if ( this.helpers[ object.id ] !== undefined ) {

			var helper = this.helpers[ object.id ];
			helper.parent.remove( helper );

			delete this.helpers[ object.id ];

			this.signals.helperRemoved.dispatch( helper );

		}

	},

	//

	addScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) {

			this.scripts[ object.uuid ] = [];

		}

		this.scripts[ object.uuid ].push( script );

		this.signals.scriptAdded.dispatch( script );

	},

	removeScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) return;

		var index = this.scripts[ object.uuid ].indexOf( script );

		if ( index !== - 1 ) {

			this.scripts[ object.uuid ].splice( index, 1 );

		}

		this.signals.scriptRemoved.dispatch( script );

	},

	//

	select: function ( object ) {

		if ( this.selected === object ) return;

		var uuid = null;

		if ( object !== null ) {

			uuid = object.uuid;

		}

		this.selected = object;

		//this.config.setKey( 'selected', uuid );
		this.signals.objectSelected.dispatch( object );
		if ( object !== null ) {
			// Send uuid of selected object across socket
			var json = JSON.stringify({
				"event": "select",
				"uuid": uuid,
				"name": object.name});
			sendText(json);
		}
	},

	selectById: function ( id ) {

		if ( id === this.camera.id ) {

			this.select( this.camera );
			return;

		}

		this.select( this.scene.getObjectById( id, true ) );

	},

	selectByUuid: function ( uuid ) {

		var scope = this;

		this.scene.traverse( function ( child ) {

			if ( child.uuid === uuid ) {

				scope.select( child );

			}

		} );

	},

	deselect: function () {

		this.select( null );

	},

	focus: function ( object ) {

		this.signals.objectFocused.dispatch( object );

	},

	focusById: function ( id ) {

		this.focus( this.scene.getObjectById( id, true ) );

	},

	clear: function () {

		this.history.clear();
		this.storage.clear();

		this.camera.copy( this.DEFAULT_CAMERA );
		this.dolly_camera.copy(this.DEFAULT_CAMERA);

		var objects = this.scene.children;

		while ( objects.length > 0 ) {

			this.removeObject( objects[ 0 ] );

		}

		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};

		this.deselect();

		this.signals.editorCleared.dispatch();

	},

	//

	fromJSON: function ( json ) {

		var loader = new THREE.ObjectLoader();

		// backwards

		if ( json.scene === undefined ) {

			this.setScene( loader.parse( json ) );
			return;

		}

		var camera = loader.parse( json.camera );

		this.camera.copy( camera );
		this.camera.aspect = this.DEFAULT_CAMERA.aspect;
		this.camera.updateProjectionMatrix();

		this.history.fromJSON( json.history );
		this.scripts = json.scripts;

		this.setScene( loader.parse( json.scene ) );

	},

	addfromJSON: function ( json ) {

		var loader = new THREE.OpenSimLoader();
		this.signals.sceneGraphChanged.active = false;
		model = loader.parse( json );
		model.parent = this.modelsGroup;
		var exist = this.models.indexOf(model.uuid);
		if (exist == -1){
			//this.scene.add( model );
			this.currentModel=model;
			this.addModelLight(model);
			this.addObject(model);
			this.models.push(model.uuid);
			this.setCurrentModel(model.uuid);
			this.adjustSceneAfterModelLoading();
			//this.scripts = json.scripts;
			// The next 2 line has to be made after helper was added to scene to fix helper display
			var modelLight = model.getObjectByName('ModelLight');
			this.helpers[modelLight.id].update();
			modelLight.userData = "NonEditable";
			this.signals.sceneGraphChanged.active = true;
			this.signals.sceneGraphChanged.dispatch();
			if (!this.isExperimentalDataModel(model) || this.models.length==1)
			    this.viewFitAll();
            
			this.signals.windowResize.dispatch();

			this.buildCache(model);
			var msg = {
			    "type": "acknowledge",
			    "uuid": model.uuid
			};
			sendText(JSON.stringify(msg));
		}
	},
	buildCache: function( model) {
	    modelobject.traverse(function (child) {
	        if (child.type === "Group")
	            editor.cache[child.uuid] = child;
	    });
	},
	loadModel: function ( modelJsonFileName) {
		var loader = new THREE.XHRLoader();
		loader.crossOrigin = '';
		loader.load( modelJsonFileName, function ( text ) {
			var json = JSON.parse( text );
			//editor.clear();
			editor.addfromJSON( json );
			editor.signals.sceneGraphChanged.dispatch();
		} );	
	},
	enableShadows: function (modeluuid, newSetting) {
		modelobject = editor.objectByUuid(modeluuid);
		if (modelobject !== undefined){
		modelobject.traverse( function ( child ) {
			if (child instanceof THREE.Mesh)
			child.castShadow = newSetting;
			child.receiveShadow = newSetting;
		});
		}
	},
	closeModel: function (modeluuid) {
		if (this.models.indexOf(modeluuid)!=-1){
		    ndx = this.models.indexOf(modeluuid);
		    this.models.splice(ndx, 1);
		    modelObject = editor.objectByUuid(modeluuid);
		    editor.removeObject(modelObject);
		}
		this.signals.sceneGraphChanged.dispatch();
	},
	setCurrentModel: function ( modeluuid ) {
		if (this.currentModel === modeluuid) 
			return; // Nothing to do
		this.currentModel = modeluuid;
		if (this.currentModel === undefined)
			return;
		newCurrentModel = editor.objectByUuid(modeluuid);
		// Dim light for all other models and make the model have shadows, 
		// Specififc light
		for ( var modindex = 0; modindex < this.models.length; modindex++ ) {
		if (this.models[modindex] == modeluuid){
			modelLight = newCurrentModel.getObjectByName('ModelLight');
			modelLight.color = this.currentModelColor;
			modelLight.visible = true;
			this.enableShadows(modeluuid, true);
		}
		else if (this.onlyCurrentModelCastsShadow) { 
			other_uuid = this.models[modindex];
			nonCurrentModel = editor.objectByUuid(other_uuid);
			modelLight = nonCurrentModel.getObjectByName('ModelLight');
			modelLight.color = this.nonCurrentModelColor;
			modelLight.visible = false;
			this.enableShadows(other_uuid, false);
		}
		}
		//this.signals.sceneGraphChanged.dispatch();
	},
	toJSON: function () {

		// scripts clean up

		var scene = this.scene;
		var scripts = this.scripts;

		for ( var key in scripts ) {

			var script = scripts[ key ];

			if ( script.length === 0 || scene.getObjectByProperty( 'uuid', key ) === undefined ) {

				delete scripts[ key ];

			}

		}

		//

		return {

			metadata: {},
			project: {
				shadows: this.config.getKey( 'project/renderer/shadows' ),
				editable: this.config.getKey( 'project/editable' ),
				vr: this.config.getKey( 'project/vr' )
			},
			camera: this.camera.toJSON(),
			scene: this.scene.toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON()

		};

	},

	objectByUuid: function (uuid) {
	    var Object = this.cache[uuid];
	    if (Object !== undefined)
	        return Object;
        Object = this.scene.getObjectByProperty( 'uuid', uuid, true );
        this.cache[uuid] = Object;
        return Object;
	},

	execute: function ( cmd, optionalName ) {

		this.history.execute( cmd, optionalName );

	},

	undo: function () {

		this.history.undo();

	},

	redo: function () {

		this.history.redo();

	},

	createBackground: function (choice) {
		scope = this;
		if (choice == 'nobackground') {
			this.scene.background = new THREE.Color(0xff0000);
			this.signals.backgroundColorChanged.dispatch(this.scene.background.getHex());
			return;
		}
		// load the cube textures
		// you need to create an instance of the loader...
		var textureloader = new THREE.CubeTextureLoader();
		var path = 'images/'+choice+'/';
		textureloader.setPath(path);
		// and then set your CORS config
		var textureCube = textureloader.load( ["px.jpg",
		"nx.jpg", "py.jpg", "ny.jpg", 
		"pz.jpg", "nz.jpg"], function () {
			scope.refresh();
		});
		textureCube.format = THREE.RGBFormat;
		textureloader.mapping = THREE.CubeRefactionMapping;
		this.scene.background = textureCube;
	},
	
	createGroundPlane: function(choice) {
		if (choice == 'nofloor')
            return;
		var scope = this;
		scope = this;
		var textureLoader = new THREE.TextureLoader();
		var texture1 = textureLoader.load( "textures/"+choice+".jpg", function () {
			scope.refresh();
		});

		var material1 = new THREE.MeshPhongMaterial( { color: 0xffffff, map: texture1 } );
		texture1.wrapS = texture1.wrapT = THREE.RepeatWrapping;
		texture1.repeat.set( 64, 64);
		var geometry = new THREE.PlaneBufferGeometry( 100, 100 );
		groundPlane = new THREE.Mesh( geometry, material1 );
		groundPlane.name = 'GroundPlane';
		groundPlane.rotation.x = - Math.PI / 2;
		groundPlane.position.y = -.01;
		groundPlane.scale.set( 500, 500, 500 );
		groundPlane.receiveShadow = true;
		groundPlane.userData = "NonEditable"; // Ground plane is not selectable
		this.addObject(groundPlane);
		this.groundPlane = groundPlane;
	},
	
	createWall: function() {
		var textureLoader = new THREE.TextureLoader();
		var texture1 = textureLoader.load( "textures/wall.jpg" );
		var material1 = new THREE.MeshPhongMaterial( { color: 0xffffff, map: texture1, side:2 } );
		var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
		wallPlane = new THREE.Mesh( geometry, material1 );
		wallPlane.name = 'Wall';
		wallPlane.position.x = 0;
		wallPlane.position.y = 5000;
		wallPlane.rotation.y = Math.PI / 2;
		wallPlane.scale.set(10, 10 , 10);
		wallPlane.receiveShadow = true;
		wallPlane.visible = false;
		this.environment.add(wallPlane);
	},
	createGlobalFrame() {
		this.globalFrameGroup = new THREE.Group();
		this.globalFrameGroup.name = "GroundFrame";
		this.addObject(this.globalFrameGroup);
		// Three cylinders of colors RGB in XYZ directions rather than std small AxesHelper
		var geometryx = new THREE.CylinderGeometry(5, 5, 400, 32);
		var materialx = new THREE.MeshBasicMaterial({ color: 0xffff0000 });
		var cylinderx = new THREE.Mesh(geometryx, materialx);
		cylinderx.name = "Cylinderx";
		cylinderx.position.x = 200;
		cylinderx.rotation.z = -1.57;
		var geometryy = new THREE.CylinderGeometry(5, 5, 400, 32);
		var materialy = new THREE.MeshBasicMaterial({ color: 0xff00ff00 });
		var cylindery = new THREE.Mesh(geometryy, materialy);
		cylindery.name = "Cylindery";
		cylindery.position.y = 200;
		var geometryz = new THREE.CylinderGeometry(5, 5, 400, 32);
		var materialz = new THREE.MeshBasicMaterial({ color: 0xff0000ff });
		var cylinderz = new THREE.Mesh(geometryz, materialz);
		cylinderz.name = "Cylinderz";
		cylinderz.position.z = 200;
		cylinderz.rotation.x = 1.57;
		this.globalFrameGroup.add(cylinderx);
		this.globalFrameGroup.add(cylindery);
		this.globalFrameGroup.add(cylinderz);
		this.globalFrameGroup.visible = false;
	},
	toggleGlobalFrame(){
		// flip group visible flag on/off
		this.globalFrameGroup.visible = !this.globalFrameGroup.visible;
		this.refresh();
	},
	createModelsGroup: function () {
		if (this.modelsGroup == undefined) {
		modelsGroup = new THREE.Group();
		modelsGroup.name = "Models";
		this.addObject(modelsGroup);
		this.modelsGroup = modelsGroup;
		}
	},
	createEnvironment: function() {
		this.environment = new THREE.Group();
		this.environment.name = "Environment";
		this.environment.userData = "NonEditable";
		this.addObject(this.environment);
	},
	createLights: function () {
		amb = new THREE.AmbientLight(0xffffff);
		amb.name = 'AmbientLight';
		amb.intensity = 0.2;
		this.addObject(amb);
		sceneLightColor = new THREE.Color().setHex(12040119);
		directionalLight = new THREE.DirectionalLight(sceneLightColor);
		directionalLight.name = 'CameraLight';
		this.sceneLight = directionalLight;
		this.addObject(directionalLight);
//
        dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.name = 'SunLight';
        dirLight.intensity = 0.2;
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( 1, 3, -1 );
        dirLight.position.multiplyScalar( 500 );
        this.environment.add(dirLight);

        dirLight.castShadow = true;

  		dirLight.shadow.camera.bottom = -2000;
 		dirLight.shadow.camera.far = 8000;
 		dirLight.shadow.camera.left = -2000;
 		dirLight.shadow.camera.right = 2000;
 		dirLight.shadow.camera.top = 2000;
 		dirLight.shadow.mapSize.width = 1024;
 		dirLight.shadow.mapSize.height = 1024;

        //dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = -0.0001;
	},

	updateBackground: function (choice) {
		var scope = this;
		this.config.setKey('skybox', choice);
		if (choice == 'nobackground') {
			color = this.config.getKey('settings/backgroundcolor');
			this.scene.background = new THREE.Color(color);
			this.signals.backgroundColorChanged.dispatch(this.scene.background.getHex());
			return;
		}
		this.createBackground(choice);
	},

	updateGroundPlane: function (choice) {
		var scope = this;
		this.config.setKey('floor', choice);
		if (choice == 'nofloor') {
			if (this.groundPlane !== null) {
				this.groundPlane.visible = false;
				this.signals.objectChanged.dispatch(groundPlane);
			}
			return;
		}
		if (this.groundPlane === null) {
			this.createGroundPlane(choice);
			return;
		}
		this.groundPlane.visible = true;
		var textureLoader = new THREE.TextureLoader();
		textureLoader.load("textures/" + choice + ".jpg",
            function (texture1) { 
		        texture1.wrapS = texture1.wrapT = THREE.RepeatWrapping;
		        texture1.repeat.set(64, 64);
		        groundMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture1 });
		        groundPlane.material = groundMaterial;
		        groundPlane.needsUpdate = true;
		        scope.refresh();
            });
	},
	updateBackgroundColor: function (newColor) {
		this.scene.background = new THREE.Color(newColor);
		this.signals.backgroundColorChanged.dispatch(this.scene.background.getHex());
	},
	getGroundSelection: function () {
		return this.config.getKey('floor');
	},
	createDollyPath: function () {

		tube = new THREE.TubeGeometry(this.dollyPath, 100, 5, 8, true);
		tubemat = new THREE.MeshLambertMaterial({
			color: 0xff00ff
		});
		tubeMesh = new THREE.Mesh(tube, tubemat);
		tubeMesh.name = "DollyPath";
		// evaluate dollyPath at t=0 and use that to place dolly_camera
		this.dolly_camera.position = this.dollyPath.getPoint(0);
		this.dolly_object.add(this.dolly_camera);
		this.dolly_object.add(tubeMesh);
		//this.dolly_object.add(this.cameraEye);
		dcameraHelper = new THREE.CameraHelper(this.dolly_camera);
		///this.sceneHelpers.add(dcameraHelper);

	},
		createLogoSprite: function() {
			var getLogoTexture = function () {
				var texture = new THREE.ImageUtils.loadTexture("OpenSimWatermarkOpaqueGrayscale128x128.png");
				return texture;
			};
			var spriteMaterial = new THREE.SpriteMaterial({
						opacity: 0.5,
						color: 0xffffff,
						transparent: false, // TODO not necessary
						// useScreenCoordinates: true, TODO deprecated
						map: getLogoTexture()}
			);

			spriteMaterial.scaleByViewport = false;
			// This used to be AdditiveBlending, but that caused the logo to
			// very bright white on certain backgrounds.
			// https://threejs.org/examples/webgl_materials_blending.html
			spriteMaterial.blending = THREE.NormalBlending;

			var sprite = new THREE.Sprite(spriteMaterial);
			sprite.scale.set(64, 64, 1);
			sprite.position.set(50, 50, 0);

			this.sceneOrtho.add(sprite);
		},
	getModel: function () {
		return editor.objectByUuid(this.currentModel);
	},
	isExperimentalDataModel: function (modelObject) {
		return modelObject.name.startsWith('ExperimentalData');
	},
	addMarkerAtPosition: function (testPosition) {

		var sphere = new THREE.SphereGeometry(20, 20, 20);
		var sphereMesh = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xff0040 }));
		sphereMesh.position.copy(testPosition);
		this.scene.add(sphereMesh);
	},

	updateCamera: function (newposition, viewCenter) {

		this.camera.position.set(newposition.x, newposition.y, newposition.z);
		this.camera.lookAt(viewCenter);
		this.sceneLight.position.copy(this.camera.position);
		var changeEvent = { type: 'change' };
		this.control.dispatchEvent( changeEvent );
		this.signals.defaultCameraApplied.dispatch(viewCenter);
	},

	viewZoom: function(in_out) {
		// Debug	    
		var vector = new THREE.Vector3(0, 0, -1 * in_out);
		vector.applyQuaternion(this.camera.quaternion);
		var newPos = this.camera.position.add(vector);
		this.camera.position.copy(newPos);
		
		this.signals.cameraChanged.dispatch(this.camera);
	},

	viewFitAll: function () {

		var modelObject = this.getModel();
		var modelbbox = new THREE.Box3();
		if (modelObject != undefined)
		    modelbbox.setFromObject(modelObject);
	    var radius = Math.max(modelbbox.max.x - modelbbox.min.x, modelbbox.max.y - modelbbox.min.y, modelbbox.max.z - modelbbox.min.z) / 2;
	    var aabbCenter = new THREE.Vector3();
	    modelbbox.center(aabbCenter);

	    // Compute offset needed to move the camera back that much needed to center AABB (approx: better if from BB front face)
	    var offset = radius / Math.tan(Math.PI / 180.0 * 25 * 0.5);

	    // Compute new camera direction and position
	    var dir = new THREE.Vector3(0.0, 0.0, 1.0);
	    if (this.camera != undefined){
	        dir.x = this.camera.matrix.elements[8];
	        dir.y = this.camera.matrix.elements[9];
	        dir.z = this.camera.matrix.elements[10];
        }
	    dir.multiplyScalar(offset);
	    var newPos = new THREE.Vector3();
	    newPos.addVectors(aabbCenter, dir);
	    this.camera.position.set(newPos.x, newPos.y, newPos.z);
	    this.camera.lookAt(aabbCenter);
		// If default view clips model, change far clipping plane
	    if (radius+offset > this.camera.far)
	    	this.camera.far = radius + offset + 500;
	    this.signals.defaultCameraApplied.dispatch(aabbCenter);

	},
	handleKey: function (keyCode) {
		var positionOffset = new THREE.Vector3();
		switch (keyCode) {
			case 73:
				this.viewZoom(100.0);
				return;
			case 79:
				this.viewZoom(-100.0);
				return;
			case 37:
				positionOffset.set(100, 0., 0.);
				break;
			case 39:
				positionOffset.set(-100, 0., 0.);
				break;
			case 38:
				positionOffset.set(0, -100, 0.);
				break;
			case 40:
				positionOffset.set(0, 100., 0.);
				break;
		}
		positionOffset.applyQuaternion(this.camera.quaternion);
		this.camera.position.add(positionOffset);
		this.camera.updateProjectionMatrix();
		// Send offset along so that rotation center is updated by EditorControl
		this.signals.cameraChanged.dispatch(this.camera, positionOffset);
		this.refresh();
	},
	// Fix scene after loading a model by placing directional light at the corner
	// of bounding box and dolly at half hight.
	adjustSceneAfterModelLoading: function () {
		var modelObject = this.getModel();
		// if ExperimentalData, also no offset
		if (this.isExperimentalDataModel(modelObject) && this.models.length > 1)
				return;
		var modelbbox = new THREE.Box3().setFromObject(modelObject);
		/*
		var helper = new THREE.BoundingBoxHelper(modelObject, 0xff0000);
		helper.name = 'boundingbox';
		helper.update();
		if (modelObject != undefined)
		modelObject.add(helper);
	    */
	    builtinLight = this.scene.getObjectByName('SunLight');
	    builtinLight.position.copy(new THREE.Vector3(modelbbox.max.x-100, modelbbox.max.y+100, modelbbox.min.z-400));
	    this.signals.cameraChanged.dispatch(this.camera);
	    // Move dolly to middle hight of bbox and make it invisible
	    this.dolly_object.position.y = (modelbbox.max.y + modelbbox.min.y) / 2;
	    path = this.scene.getObjectByName('DollyPath');
	    ///path.visible = false;
	    // Compute Offset so that models don't overlap
	    if (this.models.length==1)
		return; // No need for offset
			// if ExperimentalData, also no offset
			if (modelObject.children[0].name.startsWith('/ExperimentalData'))
				return;
		// Multiple models, compute box bounding all previous models and use to offset
		nextModel = editor.objectByUuid(this.models[0]);
		sceneBox = new THREE.Box3().setFromObject(nextModel);
		for ( var modindex = 1; modindex < this.models.length-1; modindex++ ) {
		nextModel = editor.objectByUuid(this.models[modindex]);
		nextModelBox = new THREE.Box3().setFromObject(nextModel);
		sceneBox.union(nextModelBox);
		}
		modelObject.position.z = sceneBox.max.z+modelbbox.max.z-modelbbox.min.z;
		modelObject.getObjectByName('ModelLight').target.updateMatrixWorld();
		// send message to GUI with computed offsets
		sendText(this.getModelOffsetsJson());
	},
	addModelLight: function(model) {
		var modelbbox = new THREE.Box3().setFromObject(model);
		var modelCenter = new THREE.Vector3();
		modelbbox.center(modelCenter);
		modelCenterGroup = new THREE.Group();
		modelCenterGroup.name = "ModelCenter";
		modelCenterGroup.position.copy(new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z));
		model.add(modelCenterGroup);
		modelLight =  new THREE.PointLight( {color: this.currentModelColor});
		//modelLight.castShadow = true;
		//modelLight.angle = 0.5;
		modelLight.intensity = this.modelLightIntensity;	
		modelLight.name = 'ModelLight';
		/*
		modelLight.shadow.camera.bottom = -1000;
		modelLight.shadow.camera.far = 2000;
		modelLight.shadow.camera.left = -1000;
		modelLight.shadow.camera.right = 1000;
		modelLight.shadow.camera.top = 1000;
		*/
		modelLight.position.copy(new THREE.Vector3((modelbbox.max.x+modelbbox.min.x)/2, 
		modelbbox.max.y+100, (modelbbox.min.z+modelbbox.max.z)/2));
		modelLight.target = modelCenterGroup;
		model.add(modelLight);
	},
	setFloorHeight: function(newHeight) {
		if (this.groundPlane !== undefined){
		this.groundPlane.position.y = newHeight*1000;
		}
		this.refresh();
	},
	getSceneLightPosition: function(coord) {
		sceneLightpos = this.sceneLight.position;
		if (coord === 'x')
		return sceneLightpos.x/1000.0;
		else if (coord === 'y')
		return sceneLightpos.y/1000.0;
		else
		return sceneLightpos.z/1000.0;
	},
	updateSceneLight: function(param, val){
		if (param==='color'){
		this.sceneLight.color = new THREE.Color(val);
		return;
		}
		sceneLightpos = this.sceneLight.position;
		if (param === 'x')
			sceneLightpos.x = val;
		else if (param === 'y')
			sceneLightpos.y = val;
		else if (param === 'z')
			sceneLightpos.z = val;
		else if (param === 'intensity')
			this.sceneLight.intensity = val;
		this.refresh();
	},
	updateModelLightIntensity: function(val) {
		this.modelLightIntensity = val;
		// For each model, find the light and update intensity
		for (var modindex = 0; modindex < this.models.length; modindex++) {
			nextModel = this.objectByUuid(this.models[modindex]);
			modelLight = nextModel.getObjectByName('ModelLight');
			modelLight.intensity = val;
		}
		this.refresh();
	},
	setScreenCaptureScaleup: function (scaleupFactor){
		this.signals.screenCaptureScaleupChanged.dispatch(scaleupFactor);
	},
	toggleMarkup: function () {
		oldValue = this.config.getKey('render/debug');
		newValue = !oldValue;
		this.config.setKey('render/debug', newValue);
		this.signals.renderDebugChanged.dispatch(newValue);
	},
	selectCurrentModelLight: function () {
		if (this.currentModel === undefined) return;
		var modelObject = this.getModel();
		var modelLight = modelObject.getObjectByName('ModelLight');
		this.select(modelLight);
	},
	replaceGeometry: function(geometryJson, uuid) {
		var sceneObject = this.objectByUuid(uuid);
		var oldGeometryUUID = sceneObject.geometry.uuid;
		var geometryLoader = new THREE.OpenSimLoader();
		geometryJson[0].uuid = oldGeometryUUID;
		var newgeometries = geometryLoader.parseGeometries(geometryJson);
		sceneObject.geometry = newgeometries[oldGeometryUUID];
		if (geometryJson[0].matrix!== undefined){
			var matrix = new THREE.Matrix4();
			matrix.fromArray(geometryJson[0].matrix);
			matrix.decompose(sceneObject.position, sceneObject.quaternion, sceneObject.scale);
		}
		this.signals.objectChanged.dispatch(sceneObject);
	},
	updatePath: function (pathUpdateJson) {
		var pathObject = this.objectByUuid(pathUpdateJson.uuid);
		if (pathObject !== undefined)
			pathObject.setColor(pathUpdateJson.color);
	},
	processPathEdit: function (pathEditJson) {
            if (pathEditJson.SubOperation === "recreate") {
                // We'll reuse Materials, may reuse uuid
                var uuid = pathEditJson.uuid;
                var pathSpec = pathEditJson.pathSpec;
                var points = pathSpec.points;
                var activeArray = [];
                var pointArray = [];
                for (var ppIndex=0; ppIndex < points.length; ppIndex++){
                    var pptSpec = points[ppIndex];
                    var parentUuid = pptSpec.parent;
                    var parent = this.objectByUuid(parentUuid);
                    // create pathPoint and add it to Parent; assign uuid and keep a list 
                    var geom = this.geometries[ pptSpec.geometry ];
                    var mat = this.materials[ pptSpec.material ];
                    var pptObject = new THREE.Mesh(geom, mat);
                    pptObject.uuid = pptSpec.uuid;
                    pptObject.name = pptSpec.name;
                    pptObject.visible = pptSpec.visible;
                    var matrix = new THREE.Matrix4();
                    matrix.fromArray(pptSpec.matrix);
                    matrix.decompose(pptObject.position, pptObject.quaternion, pptObject.scale);
                    parent.add(pptObject);
                    if (pptObject.name!=="")
                    	this.addObject(pptObject); // this allows objects to be pickable
                    activeArray.push(pptSpec.status==="active");
                    pointArray.push(pptObject.uuid);
                }
                // Now create GeometryPathConrol for the Geometry
                // then use it along with passed in material to create SkinnedMuscle
                // then assign uuid and add it to ground
                var newGeometry = new THREE.CylinderGeometry(pathSpec.PathGeometry.radius, pathSpec.PathGeometry.radius, 0.1, 8, 2 *(pointArray.length-1) - 1, true);
                newGeometry.uuid = pathSpec.PathGeometry.uuid;
                this.geometries[newGeometry.uuid] = newGeometry;
                var newMuscle = new THREE.SkinnedMuscle(newGeometry, this.materials[pathSpec.material], pointArray, activeArray);
                newMuscle.uuid = pathEditJson.uuid;
                this.cache[newMuscle.uuid] = newMuscle;
                var ground = this.objectByUuid(pathSpec.ground);
                ground.add(newMuscle);
                newMuscle.parent = ground;
                this.addObject(newMuscle);
                this.refresh();
                return;
            }
	    var pathObject = this.objectByUuid(pathEditJson.uuid);
	    var pathGeometry = pathObject.geometry;
	    var radius = pathGeometry.parameters.radiusTop;
	    var pathMaterial = pathObject.material;
	    var pathParent = pathObject.parent;
	    var pathPointsOn = pathObject.showInnerPathPoints;
	    if (pathEditJson.SubOperation === "refresh") {
	    	var updPoints = pathEditJson.points;
	    	for (var i = 0; i < updPoints.length; i++) {
	    		var nextEntry = updPoints[i];
	    		var uuid = nextEntry.uuid;
	    		var xform = nextEntry.matrix;
	    		var matrix = new THREE.Matrix4();
	    		matrix.fromArray(xform);
	    		var pathpointObject = this.objectByUuid(uuid);
	    		matrix.decompose(pathpointObject.position, pathpointObject.quaternion, pathpointObject.scale);
	    	}
	    	this.refresh();
	    	return;
	    }
	    this.removeObject(pathObject);
	    if (pathEditJson.SubOperation === "insert") { // Add new Pathpoint so uuid is found later
	    	var newPointJson = pathEditJson.NewPoint;
	    	var pointParent = newPointJson.parent_uuid;
	    	parentFrame = this.objectByUuid(pointParent);
	
	    	var newPointGeometry = newPointJson.geometry;
	    	var newPointMaterial = newPointJson.material;
	    	var existingPoint = undefined;
	    	for (var i = 0; i < pathEditJson.points.length; i++) {
	    		existingPoint = this.objectByUuid(pathEditJson.points[i]);
	    		if (existingPoint !== undefined)
	    			break;
	    	}
	    	var newMesh = existingPoint.clone();
	    	newMesh.uuid = newPointJson.uuid;
	    	var matrix = new THREE.Matrix4();
	    	matrix.fromArray(newPointJson.matrix);
	    	matrix.decompose(newMesh.position, newMesh.quaternion, newMesh.scale);
	    	parentFrame.add(newMesh);
	    }
	    else if (pathEditJson.SubOperation === "delete") {
	        var oldpptsUuids = pathObject.pathpoints;
	        var newpptsUuids = pathEditJson.points;
	        // delete points corresponding to uuids that are in oldpptsUuids but not newpptsUuids
	        for (var i = 0; i < oldpptsUuids.length; i++) {
	            if (newpptsUuids.includes(oldpptsUuids[i])!==true)
	                this.removeObject(this.objectByUuid(oldpptsUuids[i]));
	        }
	    }
	    // remove from parent
	    var newGeometry = new THREE.CylinderGeometry(radius, radius, 0.1, 8, 2 *(pathEditJson.points.length-1) - 1, true);
	    var newMuscle = new THREE.SkinnedMuscle(newGeometry, pathMaterial, pathEditJson.points);
	    newMuscle.uuid = pathEditJson.uuid;
	    this.cache[newMuscle.uuid] = newMuscle;
	    // add to parent.
	    pathParent.add(newMuscle);
 	    newMuscle.parent = pathParent;
	    this.refresh();
		newMuscle.togglePathPoints(pathPointsOn);
	},
    scaleGeometry: function (scaleJson) {
        sceneObject = editor.objectByUuid(scaleJson.command.objectUuid);
        geomObject = sceneObject.geometry;
        if (geomObject instanceof THREE.SphereGeometry){
            UUID = geomObject.uuid;
            newRadius = msg.command.newScale[0];
            newGeometry = new THREE.SphereGeometry(newRadius);
            newGeometry.uuid = UUID;
            sceneObject.geometry = newGeometry;
            this.signals.geometryChanged.dispatch(sceneObject);
        } else if (sceneObject instanceof THREE.ArrowHelper){
            sceneObject.setLength(1000*msg.command.newScale[0]);
            this.signals.objectChanged.dispatch(sceneObject);
        }
    },
	toggleRecord: function () {
		if (this.recording){
			this.signals.recordingStopped.dispatch();
			this.recording = false;
		}
		else {
			this.signals.recordingStarted.dispatch();
			this.recording = true;
		}
	},
	refresh: function() {
		var changeEvent = { type: 'change' };
		this.control.dispatchEvent( changeEvent );
    },
    updateModelBBox: function (bbox) {
        var modelbbox = new THREE.Box3();
        modelbbox.min.x = bbox[0] * 1000;
        modelbbox.min.y = bbox[1] * 1000;
        modelbbox.min.z = bbox[2] * 1000;
        modelbbox.max.x = bbox[3] * 1000;
        modelbbox.max.y = bbox[4] * 1000;
        modelbbox.max.z = bbox[5] * 1000;
        var radius = Math.max(modelbbox.max.x - modelbbox.min.x, modelbbox.max.y - modelbbox.min.y, modelbbox.max.z - modelbbox.min.z) / 2;
        var aabbCenter = new THREE.Vector3();
        modelbbox.center(aabbCenter);

        // Compute offset needed to move the camera back that much needed to center AABB (approx: better if from BB front face)
        var offset = radius / Math.tan(Math.PI / 180.0 * 25 * 0.5);

        // Compute new camera direction and position
        var dir = new THREE.Vector3(0.0, 0.0, 1.0);
        if (this.camera != undefined) {
            dir.x = this.camera.matrix.elements[8];
            dir.y = this.camera.matrix.elements[9];
            dir.z = this.camera.matrix.elements[10];
        }
        dir.multiplyScalar(offset);
        var newPos = new THREE.Vector3();
        newPos.addVectors(aabbCenter, dir);
        this.camera.position.set(newPos.x, newPos.y, newPos.z);
        this.camera.lookAt(aabbCenter);
        this.signals.defaultCameraApplied.dispatch(aabbCenter);

    },
    getModelOffsetsJson: function() {
        // Compute and return a json object containing uuids of models and associated positions in scene
        var offsets = {
            "type": "transforms",
            "ObjectType": "Model",
            uuids: [],
            positions: []
        };
        for ( var modindex = 0; modindex < this.models.length; modindex++ ) {
            offsets.uuids.push(this.models[modindex]);
            var nextModel = editor.objectByUuid(this.models[modindex]);
            offsets.positions.push(nextModel.position);
        };
        return JSON.stringify(offsets);
    },
    togglePathPoints: function(uuid, newValue) {
        var muscle = editor.objectByUuid(uuid);
        muscle.togglePathPoints(newValue);
        this.signals.objectChanged.dispatch(muscle);
    },
    reportRenderTime: function(frameRenderTime) {
        var info = {
            "type": "info",
            "renderTime":frameRenderTime
        };
        this.reportframeTime = false;
        sendText(JSON.stringify(info));
    }

};
