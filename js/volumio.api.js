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
		songs: []
	},
	methods: {
	    playSong: function (song) {
	      getDB("spop-goto", song.index);
	    },
	    removeSong: function (song) {
	    	getDB("spop-qrm", song.index, null, null, function(data) {
	    		console.log(data);
	    		getPlaylist();
	    	});
	    }
	}
});

// FUNCTIONS
// ----------------------------------------------------------------------------------------------------

function sendCmd(inputcmd) {
    $.ajax({
        type : 'GET',
        url : 'command/?cmd=' + inputcmd,
        async : true,
        cache : false,
        success : function(data) {
            GUI.halt = 1;
        },
    });
}

function sendPLCmd(inputcmd) {
    $.ajax({
        type : 'GET',
        url : 'db/?cmd=' + inputcmd,
        async : true,
        cache : false,
        success : function(data) {
            GUI.halt = 1;
        },
    });
}

function backendRequest() {
    $.ajax({
        type : 'GET',
        url : '_player_engine.php?state=' + GUI.MpdState['state'],
        async : true,
        cache : false,
        success : function(data) {
			GUI.MpdState = data;
            renderUI();
			$('#loader').hide();
            backendRequest();
        },
        error : function() {
            // setTimeout(function() {
            //     GUI.state = 'disconnected';
            //     $('#loader').show();
            //     $('#countdown-display').countdown('pause');
            //     window.clearInterval(GUI.currentKnob);
            //     backendRequest();
            // }, 2000);
        }
    });
}

function backendRequestSpop() {
    $.ajax({
        type : 'GET',
        url : '_player_engine_spop.php?state=' + GUI.SpopState['state'],
        async : true,
        cache : false,
        success : function(data) {
			if (data != '') {
				GUI.SpopState = data;
				renderUI();
	            backendRequestSpop();
			} else {
				setTimeout(function() {
					backendRequestSpop();
				}, 5000);
			}
        },
        error : function() {
            setTimeout(function() {
                backendRequestSpop();
            }, 5000);
        }
    });
}

function toggleActive($ele, $parent) {
    if(!$parent) {
    	$parent = $ele.parent();
    }
    //$ele.find('li').removeClass('active');
    $parent.siblings().removeClass('active');

    $parent.addClass('active');
}

function renderUI() {
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

// Non-caching version of getPlaylist
function getPlaylist() {
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: 'db/?cmd=spop-qls',
        cache: false,
        async: true,

        success: function (data) {
        	if(data) {
        		Playlist.songs = data.tracks; 
        	}
            // var current = parseInt(json['song']);
            // if (current != json && GUI.halt != 1) {
            //     customScroll('pl', current, 200); // active current song
            // }
        },

        error: function(jqXHR, textStatus, errorThrown) {
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
	      //getDB("spop-goto", song.index);
	    }
	}
});	

function getDB(cmd, path, browsemode, uplevel, callback, fail){

	var data = { "path" : path };

	if (cmd == 'filepath') {
		callback = function(data) {
			populateDB(data, path, uplevel);
		};
	}

	if (cmd == 'search') {
		var keyword = $('#db-search-keyword').val();
		data = { 'query': keyword };
		cmd = "search&querytype=" + browsemode;
		callback = function(data) {
			populateDB(data, path, uplevel, keyword);
			$("#open-panel-sx a").click();
		};
	}

	$.post('db/?cmd=' + cmd, data, callback, 'json').fail(function(a, b, c) {
		console.error("Error: command " + cmd + ", path: " + path);
		console.log(a);
		console.log(b);
		console.log(c);
	});
}

function populateDB(data, path, uplevel, keyword){
	console.log(data);
	if (path) GUI.currentpath = path;
    
    MPDFile.files = [];
    MPDFile.mpdDirectories = [];
    MPDFile.spotifyTracks = [];
    MPDFile.spotifyDirectories = [];
    MPDFile.isLibrary = false;
	//var DBlist = $('ul.database');
	//DBlist.html('');

	if (keyword) {
		var results = (data.length) ? data.length : '0';
		var s = (data.length == 1) ? '' : 's';
		var text = "" + results + ' result' + s + ' for "<em class="keyword">' + keyword + '</em>"';
		//$("#db-back").attr("title", "Close search results and go back to the DB");
		//$("#db-back-text").html(text);
		//$("#db-back").show();

	} else if (path != '') {
		//$("#db-back").attr("title", "");
		//$("#db-back-text").html("back");
		//$("#db-back").show();

	} else {
        //$("#db-back").hide();

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

// update interface
function updateGUI(objectInputState){

	var $elapsed = $("#elapsed");
	var $total = $('#total');
	var $playlistItem = $("#playlist").find('.playlist li');
	var $playI = $("#play").find("i");

    // check MPD status
    if (objectInputState['state'] == 'play') {
        $playI.removeClass('fa fa-play').addClass('fa fa-pause');

    } else if (objectInputState['state'] == 'pause') {
        //$('#playlist-position').html('Not playing');
        $playI.removeClass('fa fa-pause').addClass('fa fa-play');

    } else if (objectInputState['state'] == 'stop') {
        $playI.removeClass('fa fa-pause').addClass('fa fa-play');
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
    $('#currentartist').html(objectInputState['currentartist']);
    $('#currentsong').html(objectInputState['currentsong']);
    $('#currentalbum').html(objectInputState['currentalbum']);
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