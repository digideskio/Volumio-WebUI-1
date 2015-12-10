<?php
 
// common include
include('../inc/connection.php');
error_reporting(ERRORLEVEL);

header('Content-Type: application/json');

if (isset($_GET['cmd']) && $_GET['cmd'] != '') {

        if ( !$mpd ) {
			echo json_encode(['error' => 'Error Connecting to MPD daemon']);
		} else {
			$sRawCommand = $_GET['cmd'];
			$sSpopCommand = NULL;

			if ($spop) {
			// If Spop daemon connected
				$stringSpopState = getSpopState($spop,"CurrentState")['state'];

				if (strcmp($stringSpopState, 'play') == 0 || strcmp($stringSpopState, 'pause') == 0) {
				// If spotify playback mode
					if (strcmp($sRawCommand, "previous") == 0) {
						$sSpopCommand = "prev";

					} else if (strcmp($sRawCommand, "pause") == 0) {
						$sSpopCommand = "toggle";

					} else if (strcmp(substr($sRawCommand,0,6), "random") == 0) {
						$sSpopCommand = "shuffle";

					} else if (strcmp(substr($sRawCommand,0,6), "repeat") == 0) {
						$sSpopCommand = "repeat";

					} else if (strcmp(substr($sRawCommand,0,6), "single") == 0 || strcmp(substr($sRawCommand,0,7), "consume") == 0) {
						// Ignore command since spop does not support
						$sSpopCommand = "";

					} else if (strcmp($sRawCommand, "play") == 0 || strcmp($sRawCommand, "next") == 0 || strcmp($sRawCommand, "stop") == 0 || strcmp(substr($sRawCommand,0,4), "seek") == 0) {
						$sSpopCommand = $sRawCommand;

					}

				}

			}

			if (isset($sSpopCommand)) {
			// If command is to be passed to spop
				if (strcmp($sSpopCommand,"") != 0) {
					echo json_encode(sendSpopCommand($spop,$sSpopCommand));
				}

			} else {
			// Else pass command to MPD
				echo json_encode(sendMpdCommand($mpd,$sRawCommand));

			}

        }

} else {
	echo json_encode(
		[
		'service'       => 'MPD COMMAND INTERFACE',
		'disclaimer'    => 'INTERNAL USE ONLY!',
		'hosted_on' 	=> gethostname() . ":" . $_SERVER['SERVER_PORT']
		]);

}

if ($mpd) {
	closeMpdSocket($mpd);

}

if ($spop) {
	closeSpopSocket($spop);

}

?>

