/**
 * @author aymanhab after mrdoob / http://mrdoob.com/
 */

Menubar.Movies = function ( editor ) {

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setClass( 'menu' );

	var isPlaying = false;

	var title = new UI.Panel();
	title.setClass( 'title' );
	title.setTextContent( 'Movies' );
	title.onClick( function () {

		if ( isPlaying === false ) {

			isPlaying = true;
			title.setTextContent( 'Stop' );
			signals.startPlayer.dispatch();

		} else {

			isPlaying = false;
			title.setTextContent( 'Movies' );
			signals.stopPlayer.dispatch();

		}

	} );
	container.add( title );

	return container;

};
