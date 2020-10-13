/**
 * @author mrdoob / http://mrdoob.com/
 */

Sidebar.Animation = function ( editor ) {

	var signals = editor.signals;

	var options = {};
	var possibleAnimations = {};
	var cycleTime = 20;
	var showCameraOnlyBool = false;
	var recording = false;

	var container = new UI.CollapsiblePanel();
	container.setCollapsed( editor.config.getKey( 'ui/sidebar/animation/collapsed' ) );
	container.onCollapsedChange( function ( boolean ) {

		editor.config.setKey( 'ui/sidebar/animation/collapsed', boolean );

	} );
	//container.setDisplay( 'none' );

	container.addStatic( new UI.Text( 'Animation' ).setTextTransform( 'uppercase' ) );
	container.add( new UI.Break() );

	var animationsRow = new UI.Row();
	container.add( animationsRow );

	

	var animations = { };
    /*
	signals.objectAdded.add( function ( object ) {

		object.traverse( function ( child ) {

			if ( child instanceof THREE.SkinnedMesh ) {

				var material = child.material;

				if ( material instanceof THREE.MultiMaterial ) {

					for ( var i = 0; i < material.materials.length; i ++ ) {

						material.materials[ i ].skinning = true;

					}

				} else {

					child.material.skinning = true;

				}

				animations[ child.id ] = new THREE.Animation( child, child.geometry.animation );

			} else if ( child instanceof THREE.MorphAnimMesh ) {

				var animation = new THREE.MorphAnimation( child );
				animation.duration = 30;

				// temporal hack for THREE.AnimationHandler
				animation._play = animation.play;
				animation.play = function () {
					this._play();
					THREE.AnimationHandler.play( this );
				};
				animation.resetBlendWeights = function () {};
				animation.stop = function () {
					this.pause();
					THREE.AnimationHandler.stop( this );
				};

				animations[ child.id ] = animation;

			}

		} );

	} );
    */
	signals.objectSelected.add( function ( object ) {

		container.setDisplay( 'none' );

		if ( object instanceof THREE.PerspectiveCamera  ) {

			animationsRow.clear();

			var animation = animations[object.id];

			var cycleRow = new UI.Row();
			var cycle = new UI.Integer(cycleTime).setRange(1, 60).onChange(update);

			cycleRow.add(new UI.Text('Cycle (s)').setWidth('90px'));
			cycleRow.add(cycle);

			animationsRow.add(cycleRow);

			var showCameraOnlyRow = new UI.Row();
			var showCameraOnly = new UI.Checkbox(showCameraOnlyBool).setLeft('100px').onChange(function () { showCameraOnlyBool = showCameraOnly.getValue(); });

			showCameraOnlyRow.add(new UI.Text('Preview Camera Only').setWidth('90px'));
			showCameraOnlyRow.add(showCameraOnly);

			animationsRow.add(showCameraOnlyRow);


			var playButton = new UI.Button( 'Play' ).onClick( function () {

			    var position = { x: 0, y: 0, z: 0 };
			    var target = { x: 100, y: 0, z: 0 };
			    var tween = new TWEEN.Tween(position).to(target, cycleTime*1000);
			    var dModel = editor.getModel();
			    tween.onUpdate(function () {
			        dModel.position.x = position.x;
			        dModel.position.y = position.y;
			        dModel.position.z = position.z;
			        //dModel.updateMatrix();
			    });
			    tween.onComplete(function () {
			        signals.animationStopped.dispatch();
			        recordButton.setValue(false);
			        recording = false;
			    });
			    signals.animationStarted.dispatch(cycleTime, showCameraOnlyBool, recording);
			    tween.start();
			} );
			animationsRow.add( playButton );

			var pauseButton = new UI.Button( 'Stop' ).onClick( function () {
			    signals.animationStopped.dispatch();
			    recordButton.setValue(false);
			    recording = false;
			});
			animationsRow.add(pauseButton);
			animationsRow.add(new UI.Text('  Record: '));
			var recordButton = new UI.Checkbox('Record').onClick(function () {
			    if (recording)
			        signals.recordingStopped.dispatch();
			    recording = recordButton.getValue();
			});
			recordButton.setValue(recording);
			animationsRow.add(recordButton);
			container.setDisplay( 'block' );

		}
        function update() {
            cycleTime = cycle.getValue();
        }

	} );


	return container;

}
