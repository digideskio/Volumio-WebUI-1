<?php 
// common include
include('inc/connection.php');

// set template
$tpl = "indextpl.html";
$sezione = basename(__FILE__, '.php');
$_section = $sezione;
include('_header.php');
// Check updates before everything else, since if state is outdated then other parts of the webui may crash
if (!isset($_GET['skip_updates']) || $_GET['skip_updates'] != '1') 
{
    include('updates/check_updates.php');
}

playerSession('open',$db,'','');
playerSession('unlock',$db,'','');

// set template
$tpl = "indextpl.html";
?>
<!-- content --!>
<?php
eval("echoTemplate(\"".getTemplate("templates/$tpl")."\");");
?>
<!-- content -->
<?php
//generic functions in home
if (isset($_POST['syscmd'])) {
    if ($_SESSION['w_lock'] != 1 && $_SESSION['w_queue'] == '') {
        session_start();
        sendMpdCommand($mpd,'clear');
        // set UI notify
        $_SESSION['notify']['title'] = 'Clear Queue';
        $_SESSION['notify']['msg'] = 'Play Queue Cleared';
        // unlock session file
        playerSession('unlock');
    } else {
        echo "background worker busy";
    }
    // unlock session file
    playerSession('unlock');
}
?>

<?php include('_footer.php'); ?>
