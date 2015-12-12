<?php 

include('inc/connection.php');
playerSession('open',$db,'',''); 

if (!$mpd) 
{
	echo 'Error Connecting MPD Daemon';
} 
else 
{
	// fetch MPD status
	$status = _parseStatusResponse(MpdStatus($mpd));

	// check for CMediaFix
	if (isset($_SESSION['cmediafix']) && $_SESSION['cmediafix'] == 1) 
	{
		$_SESSION['lastbitdepth'] = $status['audio'];
	}
	
	// check for Ramplay
	if (isset($_SESSION['ramplay']) && $_SESSION['ramplay'] == 1) 
	{
		// record "lastsongid" in PHP SESSION
		$_SESSION['lastsongid'] = $status['songid'];

		// Control for cancelling ramplay
			// if (!rp_checkPLid($_SESSION['lastsongid'],$mpd)) {
			// rp_deleteFile($_SESSION['lastsongid'],$mpd);
			// }

		// feth next song and put in SESSION
		$_SESSION['nextsongid'] = $status['nextsongid'];
	}

	// register player STATE in SESSION
	$_SESSION['state'] = $status['state'];

	// Unlock SESSION file
	session_write_close();

	// -----  check and compare GUI state with Backend state  ----  //
	if ($_GET['state'] == $status['state']) 
	{
		// If the playback state is the same as specified in the ajax call
		// Wait until the status changes and then return new status
		$status = monitorMpdState($mpd);
	} 
	// -----  check and compare GUI state with Backend state  ----  //

	$curTrack = getTrackInfo($mpd,$status['song']);
	
	foreach($curTrack[0] as $key => $value)
	{
		if($key == "Name") 
		{
			$key = "Title";
		}
		
		$status[$key] = $value;
	}
	
	$fileName = "/mnt/" . str_replace("\\", "/", $status['file']);
	$path = substr($fileName, 0, strrpos($fileName, '/') + 1) . "Folder.jpg";
	$type = pathinfo($path, PATHINFO_EXTENSION);
	$data = file_get_contents($path);
	
	if($data)
	{
		$base64 = base64_encode($data);
		$status['base64'] = $base64;
	}
	
	if (isset($status['Title'])) 
	{
		$status['currentartist'] = $status['Artist'];
		$status['currentsong'] = $status['Title'];
		$status['currentalbum'] = $status['Album'];
		$status['fileext'] = parseFileStr($status['file'],'.');
	} 
	else 
	{
		$path = parseFileStr($curTrack[0]['file'],'/');
		$status['fileext'] = parseFileStr($curTrack[0]['file'],'.');
		$status['currentartist'] = "";
		$status['currentsong'] = $song;
		$status['currentalbum'] = "path: ".$path;
	}

	// CMediaFix
	if (isset($_SESSION['cmediafix']) && $_SESSION['cmediafix'] == 1 && $status['state'] == 'play' ) 
	{
		$status['lastbitdepth'] = $_SESSION['lastbitdepth'];

		if ($_SESSION['lastbitdepth'] != $status['audio']) 
		{
			sendMpdCommand($mpd,'cmediafix');
		}
	}
	
	// Ramplay
	if (isset($_SESSION['ramplay']) && $_SESSION['ramplay'] == 1) 
	{
		// set consume mode ON
		// if ($status['consume'] == 0) {
		// sendMpdCommand($mpd,'consume 1');
		// $status['consume'] = 1;
		// }

		// Copy the text from /dev/shm
		$path = rp_copyFile($status['nextsongid'],$mpd);

		// Update MPD ramplay location
		rp_updateFolder($mpd);

		// Launch add/play song
		rp_addPlay($path,$mpd,$status['playlistlength']);
	}

	// JSON response for GUI
	header('Content-Type: application/json');
	echo json_encode($status);
		
	closeMpdSocket($mpd);
}

?>
