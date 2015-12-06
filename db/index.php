<?php

// common include
include('../inc/connection.php');
error_reporting(ERRORLEVEL);

header('Content-Type: application/json');

if (isset($_GET['cmd']) && $_GET['cmd'] != '') 
{
	if ( !$mpd ) 
	{
		echo json_encode(['error' => 'Error Connecting to MPD daemon']);	
	}  
	else 
	{
		$commandName = $_GET['cmd'];
		switch ($commandName) 
		{
			case 'filepath':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					if ($spop && strcmp(substr($_POST['path'],0,7),"SPOTIFY") == 0) 
					{
						$arraySpopSearchResults = querySpopDB($spop, 'filepath', $_POST['path']);
						echo json_encode($arraySpopSearchResults);
					} else 
					{
						$arrayMpdSearchResults = searchDB($mpd,'filepath',$_POST['path']);
						echo json_encode($arrayMpdSearchResults);
					}	
				} 
				else 
				{
					$arraySearchResults = searchDB($mpd,'filepath');
	
					if ($spop) 
					{
						$arraySpopSearchResults = querySpopDB($spop, 'filepath', '');
						$arraySearchResults = array_merge($arraySearchResults, $arraySpopSearchResults);
					}
	
					echo json_encode($arraySearchResults);
				}
	
				break;
	
			case 'playlist':
				echo json_encode(getPlayQueue($mpd));
				break;
	
			case 'add':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					echo json_encode(addQueue($mpd,$_POST['path']));
				}
				break;
			
			case 'addplay':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					$status = _parseStatusResponse(MpdStatus($mpd));
					$pos = $status['playlistlength'] ;
					addQueue($mpd,$_POST['path']);
					sendMpdCommand($mpd,'play '.$pos);
					echo json_encode(readMpdResponse($mpd));
				}
				break;
	
			case 'addreplaceplay':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					sendMpdCommand($mpd,'clear');
					addQueue($mpd,$_POST['path']);
					sendMpdCommand($mpd,'play');
					echo json_encode(readMpdResponse($mpd));
				}
				break;
			
			case 'update':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					sendMpdCommand($mpd,"update \"".html_entity_decode($_POST['path'])."\"");
					echo json_encode(readMpdResponse($mpd));
				}
				break;
			
			case 'trackremove':
				if (isset($_GET['songid']) && $_GET['songid'] != '') 
				{
					echo json_encode(remTrackQueue($mpd,$_GET['songid']));
				}
				break;
	
			case 'savepl':
				if (isset($_GET['plname']) && $_GET['plname'] != '')
				{
					sendMpdCommand($mpd,"rm \"".html_entity_decode($_GET['plname'])."\"");
					sendMpdCommand($mpd,"save \"".html_entity_decode($_GET['plname'])."\"");
					echo json_encode(readMpdResponse($mpd));
				}
				break;
			
			case 'search':
				if (isset($_POST['query']) && $_POST['query'] != '' && isset($_GET['querytype']) && $_GET['querytype'] != '') 
				{
					$arraySearchResults = searchDB($mpd,$_GET['querytype'],$_POST['query']);
	
					if ($spop) 
					{
						$arraySpopSearchResults = querySpopDB($spop, 'file', $_POST['query']);
						$arraySearchResults = array_merge($arraySearchResults, $arraySpopSearchResults);
					}
	
					echo json_encode($arraySearchResults);
				}
	
				break;
	
			case 'loadlib':
				echo loadAllLib($mpd);
				break;
	
			case 'playall':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					echo json_encode(playAll($mpd,$_POST['path']));
				}
				break;
	
			case 'addall':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					echo json_encode(enqueueAll($mpd,$_POST['path']));
				}
				break;
	
			case 'spop-playtrackuri':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					sendMpdCommand($mpd,'stop');
					echo json_encode(sendSpopCommand($spop, "uplay " . $_POST['path']));
				}
				break;
	
			case 'spop-addtrackuri':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					echo json_encode(sendSpopCommand($spop, "uadd " . $_POST['path']));
				}
				break;
	
			case 'spop-playplaylistindex':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					$sSpopPlaylistIndex = end(explode("@", $_POST['path']));
					sendMpdCommand($mpd,'stop');
					echo sendSpopCommand($spop, "play " . $sSpopPlaylistIndex);
				}
				break;
	
			case 'spop-addplaylistindex':
				if (isset($_POST['path']) && $_POST['path'] != '') 
				{
					$sSpopPlaylistIndex = end(explode("@", $_POST['path']));
					echo sendSpopCommand($spop, "add " . $sSpopPlaylistIndex);
				}
				break;
			default:
				$spopCommandPos = strpos($commandName, "spop-");
				die(var_dump($spopCommandName));
				if($spopCommandPos != -1) 
				{
					$spopCommand = substr($commandName, $spopCommandPos + 1, strlen($commandName) - $spopCommandPos + 1);
				
					if (isset($_POST['path']) && $_POST['path'] != '') 
					{
						$spopCommand .= " " . $_POST['path'];
					}
					
					if (isset($_POST['p2']) && $_POST['p2'] != '') 
					{
						$spopCommand .= " " . $_POST['p2'];
					}
					
					echo json_encode(sendSpopCommand($spop, $spopCommand));
				}
				break;
		}
	}
} 
else 
{
	echo json_encode(
		[
		'service'       => 'MPD DB INTERFACE',
		'disclaimer'    => 'INTERNAL USE ONLY!',
		'hosted_on' 	=> gethostname() . ":" . $_SERVER['SERVER_PORT']
		]);
}

if ($mpd) 
{
	closeMpdSocket($mpd);
}

if ($spop) 
{
	closeSpopSocket($spop);
}
?>

