jQuery(document).ready(function($){ 'use strict';

    backendRequest();

    if (GUI.state != 'disconnected') {
        $('#loader').hide();
    }

    // BUTTONS
    // ----------------------------------------------------------------------------------------------------
    // playback
    $('.btn-cmd').click(function() {
        var cmd;
        var $this = $(this);
        // stop
        if ($this.attr('id') == 'stop') {
            $this.addClass('btn-primary');
            $('#play').removeClass('btn-primary');
            refreshTimer(0, 0, 'stop');
            window.clearInterval(GUI.currentKnob);
            $('.playlist li').removeClass('active');
            $('#total').html('');
        }
        // play/pause
        else if ($this.attr('id') == 'play') {
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
            return;
        }
        // previous/next
        else if ($this.attr('id') == 'previous' || $(this).attr('id') == 'next') {
            GUI.halt = 1;
            $('#countdown-display').countdown('pause');
            window.clearInterval(GUI.currentKnob);
        }
        // step volume control
        else if ($this.hasClass('btn-volume')) {
            if (GUI.volume == null ) {
                GUI.volume = $('#volume').val();
            }
            if ($this.attr('id') == 'volumedn') {
                var vol = parseInt(GUI.volume) - 3;
                GUI.volume = vol;
                $('#volumemute').removeClass('btn-primary');
            } else if ($this.attr('id') == 'volumeup') {
                var vol = parseInt(GUI.volume) + 3;
                GUI.volume = vol;
                $('#volumemute').removeClass('btn-primary');
            } else if ($this.attr('id') == 'volumemute') {
                var $volume = $('#volume');
                if ($volume.val() != 0 ) {
                    GUI.volume = $volume.val();
                    $this.addClass('btn-primary');
                    var vol = 0;
                } else {
                    $this.removeClass('btn-primary');
                    var vol = GUI.volume;
                }
            }
            sendCmd('setvol ' + vol);
            return;
        }

        // toggle buttons
        if ($this.hasClass('btn-toggle')) {
            if ($this.hasClass('btn-primary')) {
                cmd = $this.attr('id') + ' 0';
            } else {
                cmd = $this.attr('id') + ' 1';
            }
            $this.toggleClass('btn-primary');
        // send command
        } else {
            cmd = $this.attr('id');
        }
        sendCmd(cmd);
    });

    var $dhcp = $("#dhcp");

    // show / hide static configuration based on select value
    if ($dhcp.length) {
        if ($dhcp.val() == 'false') {
            $('#network-manual-config').show();
        }
        $dhcp.change(function() {
            if ($this.val() == 'true') {
                $('#network-manual-config').hide();
            } else {
                $('#network-manual-config').show();
            }
        });
    }

    var $showAdvancedConfig = $('.show-advanced-config');
    // show advanced options
    if ($showAdvancedConfig.length) {
        $showAdvancedConfig.click(function(e) {
            e.preventDefault();
            var $this = $(this);
            if ($this.hasClass('active')) {
                $('.advanced-config').hide();
                $this.removeClass('active');
                $this.find('i')
                    .removeClass('fa fa-minus')
                    .addClass('fa fa-plus');
                $this.find('span').html('Show advanced options');
            } else {
                $('.advanced-config').show();
                $this.addClass('active');
                $this.find('i').removeClass('fa fa-plus')
                    .addClass('fa fa-minus');
                $this.find('span').html('Hide advanced options');
            }
        });
    }

    // confirm manual data
    if ($('.manual-edit-confirm').length) {
        $this.find('.btn-primary').click(function() {
            $('#mpdconf_editor').show().removeClass('hide');
            $(this).hide();
        });
    }

    var $toggledisplaylib1 = $("#toggledisplaylib1");
    var $toggledisplaylib2 = $("#toggledisplaylib2");
    var $displaylibastabblock = $("#displaylibastabblock");
    if ($toggledisplaylib1.size() > 0 && $toggledisplaylib2.size() > 0 && $displaylibastabblock.size() > 0) {
        if ($toggledisplaylib1.attr("checked") === undefined) {
            $displaylibastabblock.hide("slide");
        }
        $toggledisplaylib1.click(function() {
            $displaylibastabblock.show("slide");
        });
        $toggledisplaylib2.click(function() {
            $displaylibastabblock.hide("slide");
        });
    }
	var $togglespotify1 = $("#togglespotify1");
    var $togglespotify2 = $("#togglespotify2");
    var $displayspotifyblock = $("#displayspotifyblock");
    if ($togglespotify1.size() > 0 && $togglespotify2.size() > 0 && $displayspotifyblock.size() > 0) {
        if ($togglespotify1.attr("checked") === undefined) {
            $displayspotifyblock.hide("slide");
        }
        $togglespotify1.click(function() {
            $displayspotifyblock.show("slide");
        });
        $togglespotify2.click(function() {
            $displayspotifyblock.hide("slide");
        });
    }
});
