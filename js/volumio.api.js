 GUI = {
    MpdState: 0,
	SpopState: 0,
    cmd: 'status',
    playlist: null,
    currentsong: null,
    currentknob: null,
    state: '',
    currentpath: '',
    halt: 0,
    volume: null,
    currentDBpos: new Array(0,0,0,0,0,0,0,0,0,0,0),
    DBentry: new Array('', '', '', '', '', ''), // path, x, y, title, artist, album
    visibility: 'visible',
    DBupdate: 0
};

var Playlist = new Vue({
	el: '#playlist',
	data: {
		mpdSongs: [],
		spotifySongs: []
	},
	methods: {
	    playSpotifySong: function (song) {
	      sendCommand("spop-goto", { "path": song.index });
	    },
	    removeSpotifySong: function (song) {
	    	sendCommand("spop-qrm", { "path": song.index }, function(data) {
	    		console.log(data);
	    		getPlaylist();
	    	});
	    },
        playMpdSong: function (song) {
            sendCmd("play " + song.index);
        },
        removeMpdSong: function (song) {
            sendCmd("trackremove&songid=" + song.index);
        }
	}
});

// FUNCTIONS
// ----------------------------------------------------------------------------------------------------

function sendCmd(inputcmd) {
    AjaxUtils.get('command/?cmd=' + inputcmd, {}, function(data) {
        GUI.halt = 1;
    });
}

function sendPLCmd(inputcmd) {
    AjaxUtils.get("db/?cmd=" + inputcmd, {}, function(data) {
        GUI.halt = 1;
    });
}

function backendRequest() {
    AjaxUtils.get("_player_engine.php?state=" + GUI.MpdState['state'], {}, function(data) {
        console.log("BACKEND REQUEST");
        console.log(data);
        GUI.MpdState = data;
        if(data.base64) {
            showCoverImage(data.base64);
        }
        renderUI();
        $('#loader').hide();
        backendRequest();
    }, function(a, b, c) {
        setTimeout(function() {
            GUI.state = 'disconnected';
            $('#loader').show();
            $('#countdown-display').countdown('pause');
            window.clearInterval(GUI.currentKnob);
            backendRequest();
        }, 2000);
    });
}

function backendRequestSpop() {
    var state = GUI.SpopState['state'];
    
    if (state != 'pause' && state != 'play') {
        removeCoverImage();
    }
    
    AjaxUtils.get("_player_engine_spop.php?state=" + state, {}, function(data) {
        if (data != '') {
            GUI.SpopState = data;
            getSpopImage(data.uri);
            renderUI();
            backendRequestSpop();
        } else {
            setTimeout(function() {
                backendRequestSpop();
            }, 5000);
        }
    }, function(a, b, c) {
        setTimeout(function() {
                backendRequestSpop();
            }, 5000);
    });
}

function toggleActive($ele, $parent) {
    if(!$parent) {
    	$parent = $ele.parent();
    }
    
    $parent.siblings().removeClass('active');

    $parent.addClass('active');
}

// Non-caching version of getPlaylist
function getPlaylist() {
    sendCommand("spop-qls", null, function(data) {
        if(data) {
            Playlist.spotifySongs = data.tracks; 
        }
    });
    
    sendCommand("playlist", null, function(data) {
        if(data) {
            console.log(data);
            Playlist.mpdSongs = data; 
        }
    });
}

function parsePath(str) {
	var songpath = '';

	if(str) {
		var cutpos = str.lastIndexOf("/");

		//-- verify this switch! (Orion)
		if (cutpos !== -1) {
	        songpath = str.slice(0,cutpos);
		} else {
			songpath = '';
		}
	}
	
	return songpath;
}

var MPDFile = new Vue({
	el: '#database',
	data: {
        isLibrary: false,
		files: [],
        mpdDirectories: [],
        spotifyTracks: [],
        spotifyDirectories: []
	},
	methods: {
	    playSong: function (song) {
            sendCommands([
                        { name: 'spop-stop' }, 
                        { name: 'addplay', data: { path: song.file }}
                        ], function(data) {
                gotoPlayback();
            });
            
            //notify('add', song.title);
	    },
        playSpotifyTrack: function (playTrack) {
            sendCommand("spop-uplay", playTrack.SpopTrackUri, function(data) {
                gotoPlayback(playTrack);
                //getPlaylist();
            });
    
            $.each(this.spotifyTracks, function(index, track) {
                var trackUri = track.SpopTrackUri;

                if (trackUri && track.SpopTrackUri != playTrack.SpopTrackUri) {
                    sendCommand("spop-uadd", { path: trackUri });
                }
            });
    
            getPlaylist();
        },
        openDirectory: function (dir) {
            getDB('filepath', dir.directory, 'file', 0);
        },
        getFileName: function (file) {
            var title = file.Title;
            
            if (!title) {
                title = file.Name;
                
                if (!title) {
                    var lastIndex = file.file.lastIndexOf('/') + 1;
                    title = file.file.substr(lastIndex, file.file.length - lastIndex - 4);
                }
            }
            
            return title;
        },
        getAlbumArtist: function (file) {
            var albumArtist = "";
            
            if (file.Artist && file.Album) {
                albumArtist = file.Artist + " - " + file.Album;
            } else if(file.Artist) {
                albumArtist = file.Artist;
            }
            
            return albumArtist;
        }
	}
});	

function removeCoverImage() {
    //$("#playbackCover").removeClass("coverImage");
}

function getSpopImage(uri) {
    if (uri) {
        sendCommand("spop-uimage", { path: uri, p2: 2 }, function(data) {
            if (data) {
                if (!data.error) {
                    showCoverImage(data.data);
                }
            }
        });
    }
}

function showCoverImage(base64) {
    var visible = $(".visible-phone:visible");
    var backgroundSize = "contain";
    
    if(visible.length > 0) {
        backgroundSize = "cover";
    }
    
    $("#dynamicCss").text("#playbackCover.coverImage:after{background:url(data:image/gif;base64," + base64 + ") no-repeat 50% 0% fixed;background-size:" + backgroundSize + ";}");
    $("#playbackCover").addClass("coverImage");
}

function gotoPlayback(track) {
    $("#open-playback").find("a").click();
    
    resetState();
}

function sendCommands(commands, callback, fail) {
    $.each(commands, function(index, data) {
        sendCommand(data.name, data.data, callback, fail);
    });
}

function sendCommand(command, data, callback, fail) {
    if(data) {
        if(typeof data !== "object") {
            data = { path: data };
        }
    }
    
    getDB(command, data, null, null, callback, fail);
}

function getDB(cmd, commandData, browsemode, uplevel, callback, fail) {
    
    var path = commandData;
    
    if(commandData) {
        if(typeof commandData !== "object") {
            commandData = { path: commandData };
        }
    }
    
	if (cmd == 'filepath') {
		callback = function(data) {
			populateDB(data, path, uplevel);
		};
	}

	if (cmd == 'search') {
		var keyword = $('#db-search-keyword').val();
		commandData = { 'query': keyword };
		cmd = "search&querytype=" + browsemode;
		callback = function(data) {
			populateDB(data, path, uplevel, keyword);
			$("#open-panel-sx a").click();
		};
	}
    
    var uri = "db/?cmd=" + cmd;
    
    AjaxUtils.post(uri, commandData, function(data) {
        if (typeof callback === "function") {
            callback(data);
        }
    });
}

function populateDB(data, path, uplevel, keyword){
	if (path)  {
        GUI.currentpath = path;
    }
    
    MPDFile.files = [];
    MPDFile.mpdDirectories = [];
    MPDFile.spotifyTracks = [];
    MPDFile.spotifyDirectories = [];
    MPDFile.isLibrary = false;

	if (!keyword || path == '') {
        if (library && library.isEnabled && !library.displayAsTab) {
            MPDFile.isLibrary = true;
        }
    }

	for (var i = 0; i < data.length; i++) {
        var dataItem = data[i];
        if (dataItem.Type == 'MpdFile') {
            MPDFile.files.push(dataItem);
        } else if (dataItem.Type == 'MpdDirectory')  {
            MPDFile.mpdDirectories.push(dataItem);            
        } else if (dataItem.Type == 'SpopTrack') {
            MPDFile.spotifyTracks.push(dataItem);            
        } else if (dataItem.Type == 'SpopDirectory') {
            MPDFile.spotifyDirectories.push(dataItem);            
        }
	}

	if (typeof data[0].DisplayPath != 'undefined') {
		$('#db-currentpath span').html(data[0].DisplayPath);

	} else {
		$('#db-currentpath span').html(path);
	}

	if (uplevel) {
		$('#db-' + GUI.currentDBpos[GUI.currentDBpos[10]]).addClass('active');
		customScroll('db', GUI.currentDBpos[GUI.currentDBpos[10]]);
	} else {
		customScroll('db', 0, 0);
	}
}

var PlaybackVol = new Vue({
	el: '#playback',
	data: {
		song: {}
	},
	methods: {
	    playPause: function () {
            var cmd = '';
            if (GUI.state == 'play') {
                cmd = 'pause';
                $('#countdown-display').countdown('pause');
            } else if (GUI.state == 'pause') {
                cmd = 'play';
                $('#countdown-display').countdown('resume');
            } else if (GUI.state == 'stop') {
                cmd = 'play';
                $('#countdown-display').countdown({since: 0, compact: true, format: 'MS'});
            }

            window.clearInterval(GUI.currentKnob);
            sendCmd(cmd);
            resetState();
            //sendCommand("spop-goto", { "path": this.song.index });
	    },
	    nav: function (direction) {
	    	GUI.halt = 1;
            //console.log("nav bitch");
			$('#countdown-display').countdown('pause');
			window.clearInterval(GUI.currentKnob);
            
            sendCmd(direction);
            //resetState();
	    }
	}
});

function resetState() {
    //backendRequest();
    //backendRequestSpop();
}

function renderUI() {
    console.log("does the ui render?");
    console.log(GUI);
    if (GUI.SpopState['state'] == 'play' || GUI.SpopState['state'] == 'pause') {
       // If Spop is playing, temporarily redirect button control and title display to Spop
        GUI.state = GUI.SpopState['state'];

        // Combine the Spop state array with the Mpd state array - any state variable defined by Spop will overwrite the corresponding Mpd state variable
        var objectCombinedState = $.extend({}, GUI.MpdState, GUI.SpopState);
        updateGUI(objectCombinedState);
        refreshTimer(parseInt(objectCombinedState['elapsed']), parseInt(objectCombinedState['time']), objectCombinedState['state']);
        refreshKnob(objectCombinedState);
    } else {
       // Else UI should be connected to MPD status
        GUI.state = GUI.MpdState['state'];
        updateGUI(GUI.MpdState);
        refreshTimer(parseInt(GUI.MpdState['elapsed']), parseInt(GUI.MpdState['time']), GUI.MpdState['state']);
        refreshKnob(GUI.MpdState);
    }

    if (GUI.state != 'disconnected') {
        $('#loader').hide();
    }

    if (GUI.MpdState['playlist'] != GUI.playlist) {
        //GUI.MpdState
        getPlaylist();
        GUI.playlist = GUI.MpdState['playlist'];
    }

    GUI.halt = 0;
}

// update interface
function updateGUI(objectInputState) {
    console.log("updating ui with state");
    console.log(objectInputState);

	var $elapsed = $("#elapsed");
	var $total = $('#total');
	var $playlistItem = $("#playlist").find('.playlist li');
	var $playI = $("#play").find("i").eq(1);

    // check MPD status
    if (objectInputState['state'] == 'play') {
        $playI.removeClass('fa-play').addClass('fa-pause');

    } else if (objectInputState['state'] == 'pause') {
        $playI.removeClass('fa-pause').addClass('fa-play');

    } else if (objectInputState['state'] == 'stop') {
        $playI.removeClass('fa-pause').addClass('fa-play');
        $('#countdown-display').countdown('destroy');
        $elapsed.html('00:00');
        $total.html('');
        $('#time').val(0).trigger('change');
        $playlistItem.removeClass('active');
    }

	$elapsed.html(timeConvert(objectInputState['elapsed']));
	$total.html(timeConvert(objectInputState['time']));
	$playlistItem.removeClass('active');
	var current = parseInt(objectInputState['song']) + 1;

	if (!isNaN(current)) {
		$('.playlist li:nth-child(' + current + ')').addClass('active');
	}

	// show UpdateDB icon
	if (typeof GUI.MpdState['updating_db'] != 'undefined') {
		$('.open-panel-sx').html('<i class="fa fa-refresh fa-spin"></i> Updating');
	} else {
		$('.open-panel-sx').html('<i class="fa fa-music sx"></i> Browse');
	}

    // check song update
    if (GUI.currentsong != objectInputState['currentsong']) {
        countdownRestart(0);
        if ($('#panel-dx').hasClass('active')) {
            var current = parseInt(objectInputState['song']);
            customScroll('pl', current);
        }
    }
    // common actions

    // Don't update the knob if it's currently being changed
    var volume = $('#volume');
    if (volume[0] && (volume[0].knobEvents === undefined || !volume[0].knobEvents.isSliding)) {
        volume.val((objectInputState['volume'] == '-1') ? 100 : objectInputState['volume']).trigger('change');
    }
    console.log(objectInputState);
    PlaybackVol.song = { Artist: objectInputState['currentartist'], Title: objectInputState['currentsong'] };

    if (objectInputState['repeat'] == 1) {
        $('#repeat').addClass('btn-primary');
    } else {
        $('#repeat').removeClass('btn-primary');
    }
    if (objectInputState['random'] == 1) {
        $('#random').addClass('btn-primary');
    } else {
        $('#random').removeClass('btn-primary');
    }
    if (objectInputState['consume'] == 1) {
        $('#consume').addClass('btn-primary');
    } else {
        $('#consume').removeClass('btn-primary');
    }
    if (objectInputState['single'] == 1) {
        $('#single').addClass('btn-primary');
    } else {
        $('#single').removeClass('btn-primary');
    }

    GUI.halt = 0;
    GUI.currentsong = objectInputState['currentsong'];
	GUI.currentartist = objectInputState['currentartist'];

	//Change Name according to Now Playing
	if (GUI.currentartist != null && GUI.currentsong != null) {
		document.title = objectInputState['currentsong'] + ' - ' + objectInputState['currentartist'] + ' - ' + 'Volumio';

	} else {
		document.title = 'Volumio - Audiophile Music Player';
    }
}

// update countdown
function refreshTimer(startFrom, stopTo, state){
	var $countdownDisplay = $('#countdown-display');
    if (state == 'play') {
        $countdownDisplay.countdown('destroy');
        $countdownDisplay.countdown({since: -(startFrom), compact: true, format: 'MS'});
    } else if (state == 'pause') {
        $countdownDisplay.countdown('destroy');
        $countdownDisplay.countdown({since: -(startFrom), compact: true, format: 'MS'});
        $countdownDisplay.countdown('pause');
    } else if (state == 'stop') {
        $countdownDisplay.countdown('destroy');
        $countdownDisplay.countdown({since: 0, compact: true, format: 'MS'});
        $countdownDisplay.countdown('pause');
    }
}

// update time knob
function refreshKnob(json){
    window.clearInterval(GUI.currentKnob)
    var initTime = json['song_percent'];
    var delta = json['time'] / 1000;
    var $time = $("#time");
    $time.val(initTime*10).trigger('change');
    if (GUI.state == 'play') {
        GUI.currentKnob = setInterval(function() {
            if (GUI.visibility == 'visible') {
                initTime = initTime + 0.1;
            } else {
                initTime = initTime + 100/json['time'];
            }
            $time.val(initTime*10).trigger('change');
            //document.title = Math.round(initTime*10) + ' - ' + GUI.visibility;
        }, delta * 1000);
    }
}

// time conversion
function timeConvert(seconds) {
    if(isNaN(seconds)) {
    	display = '';
    } else {
    	minutes = Math.floor(seconds / 60);
    	seconds -= minutes * 60;
    	mm = (minutes < 10) ? ('0' + minutes) : minutes;
    	ss = (seconds < 10) ? ('0' + seconds) : seconds;
    	display = mm + ':' + ss;
    }
    return display;
}

// reset countdown
function countdownRestart(startFrom) {
	var $countdownDisplay = $("#countdown-display");
    $countdownDisplay.countdown('destroy');
    $countdownDisplay.countdown({since: -(startFrom), compact: true, format: 'MS'});
}

// set volume with knob
function setVolume(val) {
    GUI.volume = val;

	// Push volume updates into the MPD state array, since we opted not to get
	// volume change updates from MPD daemon
	if ("volume" in GUI.MpdState) {
		GUI.MpdState.volume = val;
	}

    GUI.halt = 1;

    $('#volumemute').removeClass('btn-primary');
    sendCmd('setvol ' + val);
}

// adjust knob with volume
function adjustKnobVolume(val) {
    $('#volume').val(val);
}

// scrolling
function customScroll(list, destination, speed) {
    if (typeof(speed) === 'undefined') speed = 500;

    var $window = $(window);
    var entryheight = parseInt(1 + $('#' + list + '-1').height());
    var centerheight = parseInt($window.height()/2);
    var scrolltop = $window.scrollTop();
    if (list == 'db') {
        var scrollcalc = parseInt((destination)*entryheight - centerheight);
        var scrolloffset = scrollcalc;
    } else if (list == 'pl') {
        //var scrolloffset = parseInt((destination + 2)*entryheight - centerheight);
        var scrollcalc = parseInt((destination + 2)*entryheight - centerheight);
        if (scrollcalc > scrolltop) {
            var scrolloffset = '+=' + Math.abs(scrollcalc - scrolltop) + 'px';
        } else {
            var scrolloffset = '-=' + Math.abs(scrollcalc - scrolltop) + 'px';
        }
    }
    if (scrollcalc > 0) {
        $.scrollTo( scrolloffset , speed );
    } else {
        $.scrollTo( 0 , speed );
    }
}

function randomScrollPL() {
    var n = $(".playlist li").size();
    var random = 1 + Math.floor(Math.random() * n);
    customScroll('pl', random);
}

function randomScrollDB() {
    var n = $(".database li").size();
    var random = 1 + Math.floor(Math.random() * n);
    customScroll('db', random);
}