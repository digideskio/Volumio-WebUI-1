<?php

require('config.inc');
error_reporting(ERRORLEVEL);
// include player library
include(ROOTPATH.'inc/player_lib.php');
// configuro parametri di connessione con demone MPD
$mpd = openMpdSocket(DAEMONIP, 6600) ;
$spop = openSpopSocket(DAEMONIP, 6602);
?>
