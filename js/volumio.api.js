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

function pluginListItem(id, text, faicon, onclick) {
    return '<li id="#' + id + '" class="db-plugin" onclick="'
        + onclick + '"><div class="db-icon db-other"><i class="fa '
        + faicon + ' icon-root sx"></i></div><div class="db-entry db-other">'
        + text + '</div></li>';
}

function parseResponse(inputArr,respType,i,inpath) {		
	var content = "";

	switch (respType) {
		case 'playlist':		
			// code placeholder
		break;

		case 'db':
			if (inputArr[i].Type == 'MpdFile') {
			// This is a MPD playable file
				if (typeof inputArr[i].Title != 'undefined') {
				// This is a local file with a title
					content = '<li id="db-' + (i + 1) + '" class="clearfix" data-path="';
					content += inputArr[i].file;
					content += '"><div class="db-icon db-song db-browse"><i class="fa fa-music sx db-browse"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-song db-browse">';
					content += inputArr[i].Title + ' <em class="songtime">' + timeConvert(inputArr[i].Time) + '</em>';
					content += ' <span>';
					content +=  inputArr[i].Artist;
					content += ' - ';
					content +=  inputArr[i].Album;
					content += '</span></div></li>';
					showtype = 'music'

				} else {
				// This is some other format (eg. streams)
                    var dbItemClass = (inputArr[i].Time === undefined) ? "db-other" : "db-song";
					content = '<li id="db-' + (i + 1) + '" class="clearfix" data-path="';
					content += inputArr[i].file;

					if (inpath == 'WEBRADIO') {
					// This is a webradio stream
                        content += '"><div class="db-icon ' + dbItemClass + ' db-browse"><i class="fa fa-microphone sx db-browse"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry ' + dbItemClass + ' db-browse">';
                        showtype = 'radio'

					} else {
					// This is an unknown file type
                        content += '"><div class="db-icon ' + dbItemClass + ' db-browse"><i class="fa fa-music sx db-browse"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry ' + dbItemClass + ' db-browse">';
                        showtype = 'file'

					}

					// Strip the leading path and trailing '.pls', and display only the filename
					content += inputArr[i].file.replace(inpath + '/', '').replace('.pls', '') + ' <em class="songtime">' + timeConvert(inputArr[i].Time) + '</em>';
					content += '</div></li>';
					
				}

			} else if (inputArr[i].Type == 'MpdDirectory') {
			// This is a MPD folder
				content = '<li id="db-' + (i + 1) + '" class="clearfix" data-path="';
				content += inputArr[i].directory;
				showtype = 'file';

				if (inpath != '') {
				// This is a generic folder not at the root level
					content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-folder-open sx"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-folder db-browse">';

				} else if (inputArr[i].directory == 'WEBRADIO') {
				// This is the WEBRADIO root folder
					content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-microphone icon-root sx"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu-root"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-folder db-browse">';

				} else if (inputArr[i].directory == 'NAS') {
				// This is the NAS root folder
					content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-code-fork icon-root sx"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu-root"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-folder db-browse">';

				} else if (inputArr[i].directory == 'USB') {
				// This is the USB root folder
					content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-hdd-o icon-root sx"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu-root"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-folder db-browse">';

				} else if (inputArr[i].directory == 'RAMPLAY') {
				// This is the RAMPLAY root folder
					content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-spinner icon-root sx"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu-root"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-folder db-browse">';

				}
 
				if (inputArr[i].DisplayName) {
				// If a DisplayName is available for this entry, use it
					content += inputArr[i].DisplayName;

				} else {
				// Else strip the leading path and slash, and display the folder name
					content += inputArr[i].directory.replace(inpath + '/', '');

				}

				content += '</div></li>';

			} else if (inputArr[i].Type == 'SpopTrack') {
			// This is a Spotify file
				content = '<li id="db-' + (i + 1) + '" class="clearfix" data-path="';
				content += inputArr[i].SpopTrackUri;
				content += '" data-artist="';
				content += inputArr[i].Artist;
				content += '" data-album="';
				content += inputArr[i].Album;
				content += '" data-title="';
				content += inputArr[i].Title;
				content += '"><div class="db-icon db-spop db-browse"><i class="fa fa-spotify sx db-browse"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu-spotifytrack"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-spop db-browse">';
				content += inputArr[i].Title + ' <em class="songtime">' + timeConvert(inputArr[i].Time) + '</em>';
				content += ' <span>';
				content +=  inputArr[i].Artist;
				content += ' - ';
				content +=  inputArr[i].Album;
				content += '</span></div></li>';
				showtype = 'music';

			} else if (inputArr[i].Type == 'SpopDirectory') {
			// This is a Spotify folder or playlist
				content = '<li id="db-' + (i + 1) + '" class="clearfix" data-path="';
				content += inputArr[i].directory;
				showtype = 'file';

				if (inpath != '') {
				// This is a Spotify folder not at the root level
					if (typeof inputArr[i].SpopPlaylistIndex != 'undefined') {
					// This is a browsable Spotify playlist
						content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-list-ol sx"></i></div><div class="db-action"><a href="#notarget" title="Actions" data-toggle="context" data-target="#context-menu-spotifyplaylist"><i class="fa fa-ellipsis-v"></i></a></div><div class="db-entry db-folder db-browse">';

					} else {
					// This is a generic Spotify folder
						content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-folder-open sx"></i></div><div class="db-entry db-folder db-browse">';

					}

				} else if (inputArr[i].directory == 'SPOTIFY') {
				// This is the SPOTIFY root folder
					content += '"><div class="db-icon db-folder db-browse"><i class="fa fa-spotify icon-root sx"></i></div><div class="db-entry db-folder db-browse">';

				}

				if (inputArr[i].DisplayName) {
				// If a DisplayName is available for this entry, use it
					content += inputArr[i].DisplayName;

				} else {
				// Else strip the leading path and slash, and display the folder name
					content += inputArr[i].directory.replace(inpath + '/', '');

				}

				content += '</div></li>';

			}	

		break;
		
	}

	return content;
} // end parseResponse()

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

	$.post('db/?cmd=' + cmd, data, callback, 'json').fail(function() {
		console.error("Error: command " + cmd + ", path: " + path);
	});
}

function populateDB(data, path, uplevel, keyword){
	console.log(data);
	if (path) GUI.currentpath = path;
	var DBlist = $('ul.database');
	DBlist.html('');

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
            DBlist.append(pluginListItem("db-plug-lib", "LIBRARY", "fa-columns", "showLibraryView()"));
        }
    }

	var i = 0;
	for (i = 0; i < data.length; i++) {
	 	DBlist.append(parseResponse(data,'db',i,path));
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
	if (showtype == 'radio') {
        $("#webradio-add").show();
	} else {
        $("#webradio-add").hide();
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