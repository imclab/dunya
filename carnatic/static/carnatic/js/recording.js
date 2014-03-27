$(document).ready(function() {
     audio = $("#theaudio")[0];
     renders = $('#renders');
     rendersMask = $('#rendersMask');
     capcal = $('#capcal');
     capcalTotal = $('#capcalTotal');
     renderTotal = $('#renderTotal');
     zoomFactor = "";
     waveform = $('#renderTotal img');
     plButton = $("#control .plButton");
     timecode = $("#timecode");
     zooms = $(".zoom");
     // What point in seconds the left-hand side of the
     // image refers to.
     beginningOfView = 0;
     // The 900 pitch values currently on screen
     pitchvals = new Array(900);
	 waveform.click(function(e) {
	 	var offset_l = $(this).offset().left - $(window).scrollLeft();
		var left = Math.round( (e.clientX - offset_l) );
	    mouPlay(left);
	 });
     waveform.mouseenter(function() {
         if (pagesound.duration) {
             waveform.css("cursor", "pointer");
         } else {
             waveform.css("cursor", "wait");
         }
     });
     $(".zoom").click(function() {
         var level = $(this).data("length");
         zoom(level);
     });
     loaddata();

     $("#showRhythm").click(function(e) {
        drawwaveform();
     });

     soundManager.onready(function() {
         console.debug("SOUNDMANAGER ACTIVE");
         pagesound = soundManager.createSound({
               url: audiourl
         });

     });
});

function plotsa(context) {
    // Sa and sa+1 line.
    context.beginPath();
    // sa+1, dotted
    context.moveTo(0, 128);
    for (var i = 0; i < 900; i+=10) {
        context.moveTo(i, 128.5);
        context.lineTo(i+5, 128.5);
    }
    // sa, solid
    context.moveTo(0, 192.5);
    context.lineTo(900, 192.5);
    context.strokeStyle = "#eee";
    context.lineWidth = 1;
    context.stroke();
    context.closePath()
}

function spectrogram(context, view) {
    plotsa(context);
    var waszero = false;
    context.moveTo(0, 10);
    context.lineTo(10, 10);
    context.moveTo(0,0);
    var skip = secondsPerView / 4;
    // Start is in samples
    var start = (beginningOfView / secondsPerView) * 900 * skip;
    // Number of pixels we draw
    var end = Math.min(900+start, start+(view.length-start)/skip);
    var remaining = view.length-start;
    //console.debug("length " + view.length);
    //console.debug(remaining + " samples remaining");
    //console.debug("with skip, " + (remaining/skip) + " rem");
    //console.debug("skip " + skip);
    //console.debug("draw from " + start + " to " + end);
    context.beginPath();
    for (var i = start; i < end; i++) {
        // Find our point
        var xpos = i-start;
        var dataindex = start + xpos*skip;
        var data = view[dataindex];
        // Invert on canvas
        var tmp = 255-data;
        //console.debug(" at ("+xpos+","+tmp+") data " + dataindex);
        // We choose 0 if the pitch is unknown, or 255 if it's
        // higher than the 3 octaves above tonic. If so, we don't
        // want to draw something, just skip until the next value
        if (tmp == 0 || tmp == 255) {
            waszero = true;
            context.moveTo(xpos, tmp);
        } else {
            if (waszero) {
                waszero = false;
                context.moveTo(xpos, tmp);
            } else {
                context.lineTo(xpos, tmp);
            }
        }
        // Set the pitchvals so we can draw the histogram
        pitchvals[xpos] = tmp;
    }

    //context.strokeStyle = "#e71d25";
    context.strokeStyle = "#eee";
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
}

function plothistogram(pitch) {
    pitch = pitch || 0;
    var histogram = $("#histogramcanvas")[0];
    histogram.width = 200;
    histogram.height = 256;
    var context = histogram.getContext("2d");
    //context.moveTo(180, 10);
    //context.lineTo(200, 10);
    //context.moveTo(200, 256);
    var max = 0;
    var data = histogramdata;
    for (var i = 0; i < data.length; i++) {
        if (data[i] > max) {
            max = data[i];
        }
    }
    var factor = 150 / max;
    context.beginPath();
    for (var i = 0; i < data.length; i++) {
        v = data[i] * factor;
        context.lineTo(200-v, 256-i);
    }
    context.lineWidth = 2;
    context.strokeStyle = "#e71d25";
    context.stroke();
    context.closePath();

    // Pitch
    if (pitch > 0 && pitch < 255) {
        pitch = Math.floor(pitch) + 0.5;
        context.beginPath();
        context.moveTo(0, pitch);
        context.lineTo(200, pitch);
        context.lineWidth = 1;
        context.strokeStyle = "#000";
        context.stroke();
        context.closePath();
    }
}

function plotpitch() {
    // In order to account for slow internet connections,
    // we always load one image ahead of what we need.
    // TODO: We need to know when the final image is.
    var spec = new Image();
    spec.src = specurl;
    var view = new Uint8Array(pitchdata);
    var canvas = $("#pitchcanvas")[0];
    canvas.width = 900;
    canvas.height = 256;
    var context = canvas.getContext("2d");
    spec.onload = function() {
        context.drawImage(spec, 0, 0);
        spectrogram(context, view);
    }
}

function drawwaveform() {
    var wave = new Image();
    wave.src = waveformurl;
    var canvas = $("#rhythmcanvas")[0];
    canvas.width = 900;
    canvas.height = 256;
    var context = canvas.getContext("2d");
    wave.onload = function() {
        context.drawImage(wave, 0, 0);
        plottempo(context, aksharadata);
        plotticks(context, rhythmdata);
    }
}

function sortNumber(a,b) {
    return a - b;
}

function plotticks(context, data) {
    // TODO: it looked like for some of this data
    // we were sorting by asciibetical not numeric
    data.sort(sortNumber);
    from = data[0];
    to = data[data.length-1];
    $("#pulseFrom").html(formatseconds(from));
    $("#pulseTo").html(formatseconds(to));
    var show = $("#showRhythm").is(':checked');

    if ((secondsPerView == 8 || secondsPerView == 4) && show) {
        context.beginPath();
        //console.debug("draw ticks");
        for (var i = 0; i < data.length; i++) {
            var val = data[i];
            var endVal = beginningOfView+secondsPerView;
            if (val > beginningOfView && val < endVal) {
                //console.debug("got a tick at " + val);
                // We draw it.
                var position = (val-beginningOfView) / secondsPerView * 900;
                position = Math.floor(position) + 0.5;
                //console.debug("drawing at " + position);
                context.moveTo(position, 0);
                context.lineTo(position, 255);
            }
        context.lineWidth = 1;
        //context.strokeStyle = "#e71d25";
        context.strokeStyle = "#eee";
        context.stroke();
        }
        context.closePath();
    }
}

function plottempo(context, data) {
    var low = 1;
    var high = 0;
    for (var i = 0; i < data.length; i++) {
        var val = data[i][1];
        if (val > high) {
            high = val;
        }
        if (val < low) {
            low = val;
        }
    }
    $(".tempoup").html(high*1000 + " ms");
    $(".tempodown").html(low*1000 + " ms");
    high = high * 1.2;
    low = low * 0.8;
    var factor = 128 / (high - low);

    var secPerPixel = 900 / secondsPerView;
    var moved = false;
    context.beginPath();
    for (var i = 0; i < data.length; i++) {
        var time = data[i][0];
        if (time >= beginningOfView) {
            // Data points are every 0.5 seconds
            // TODO: This doesn't draw the point at or near x=0
            var x = (time-beginningOfView) * secPerPixel;
            if (x > 900) {
                break;
            }
            var y = (data[i][1]-low) * factor;
            y = Math.floor(y) + 0.5;
            if (!moved) {
                context.moveTo(0, 256-y);
                moved = true;
            }
            context.lineTo(x, 256-y);
            //console.debug("line at position "+y);
        }
    }
    context.strokeStyle = "#eee";
    context.lineWidth = 1;
    context.stroke();
    context.closePath();
}

function loaddata() {
    // We do pitch track with manual httprequest, because
    // we want typedarray access

    histogramDone = false;
    pitchDone = false;
    var oReq = new XMLHttpRequest();
    oReq.open("GET", pitchtrackurl, true);
    oReq.responseType = "arraybuffer";
    oReq.onload = function(oEvent) {
        if (oReq.status == 200) {
            pitchdata = oReq.response;
            pitchDone = true;
            dodraw();
        }
    };
    oReq.send();
    $.ajax(histogramurl, {dataType: "json", type: "GET",
        success: function(data, textStatus, xhr) {
            histogramdata = data;
            histogramDone = true;
            dodraw();
    }});

    var ticksDone = false;
    var rhythmDone = false;

    $.ajax(rhythmurl, {dataType: "json", type: "GET",
        success: function(data, textStatus, xhr) {
            rhythmdata = data;
            ticksDone = true;
            dodraw();
    }});

    $.ajax(aksharaurl, {dataType: "json", type: "GET",
        success: function(data, textStatus, xhr) {
            aksharadata = data;
            rhythmDone = true;
            dodraw();
    }});

    function dodraw() {
        if (ticksDone && rhythmDone && pitchDone && histogramDone) {
            drawdata();
        }
    }
}

function drawdata() {
    drawwaveform();
    plotpitch();
    plothistogram();
    var start = beginningOfView;
    var skip = secondsPerView / 4;
    $(".timecode1").html(formatseconds(start));
    $(".timecode2").html(formatseconds(start+skip));
    $(".timecode3").html(formatseconds(start+skip*2));
    $(".timecode4").html(formatseconds(start+skip*3));
    $(".timecode5").html(formatseconds(start+skip*4));
}

function mouPlay(desti){
    console.debug("play click!");
	percent = desti/waveform.width();
    console.debug("percent - "+percent);

    clickseconds = recordinglengthseconds * percent
	console.log(clickseconds+" - "+ recordinglengthseconds);

    posms = clickseconds * 1000;
    part = Math.ceil(clickseconds / secondsPerView);
    // Update the internal position counter
    beginningOfView = part * secondsPerView;

    if (pagesound.duration) {
        // We can only set a position if it's fully loaded
        pagesound.pause();
        pagesound.setPosition(posms);
        replacepart(part);
        pagesound.play();
    }
}

function play() {
    pagesound.play({onfinish: function() {
        window.clearInterval(int);
    }});
    int = window.setInterval(updateProgress, 30);
}
function pause() {
    pagesound.pause();
    window.clearInterval(int);
}

function formatseconds(seconds) {
    progress_seconds = Math.ceil(seconds);
    progress_minutes = Math.floor(seconds/60);
    resto = (progress_seconds-(progress_minutes*60));
    // never show :60 in seconds part
    if (resto >= 60) {
        resto = 0;
        progress_minutes += 1;
    }
    if(resto<10){
		resto = "0"+resto;
    }
    if(progress_minutes<10){
		progress_minutes = "0"+progress_minutes;
    }
    timecodeHtml = ""+progress_minutes+":"+resto;
    return timecodeHtml;
}

function replacepart(pnum) {
    waveformurl = waveformurl.replace(/part=[0-9]+/, "part="+pnum);
    specurl = specurl.replace(/part=[0-9]+/, "part="+pnum);
    drawdata();
}

function updateProgress() {
    var currentTime = pagesound.position / 1000;
    // formatseconds appears to run 1 second ahead of time,
    // so correct for it here
    formattime = formatseconds(currentTime-1);
    progress_percent = (currentTime-beginningOfView) / secondsPerView * 100;
    total_progress_frac = (currentTime/recordinglengthseconds);
	ampleMask = rendersMask.width();
	ampleRenders = renders.width();
	ampleRenderTotal = renderTotal.width();
    leftLargeView = ((ampleRenders*progress_percent)/100);
    leftSmallView = ampleRenderTotal*total_progress_frac;
    capcal.css('left', leftLargeView-5);
    capcalTotal.css('left', leftSmallView-6);

    if (leftLargeView > 900) {
        beginningOfView += secondsPerView;
        pnum = Math.floor(beginningOfView / secondsPerView + 1);
        replacepart(pnum)
    }
    timecode.html(formattime + "<span>"+recordinglengthfmt+"</span>");

    // Current pitch
    var pitchindex = Math.floor(leftLargeView);
    var p = pitchvals[pitchindex];
    plothistogram(p);
};

function zoom(level){
    secondsPerView = level;
    waveformurl = waveformurl.replace(/waveform[0-9]{1,2}/, "waveform"+level);
    specurl = specurl.replace(/spectrum[0-9]{1,2}/, "spectrum"+level);
    // When we go from a zoomed in to a zoomed out size,
    // we need to make sure that `beginningOfView` is on an
    // image boundary
    beginningOfView = Math.floor(beginningOfView / secondsPerView);
    pnum = Math.floor(beginningOfView / secondsPerView + 1);
    waveformurl = waveformurl.replace(/part=[0-9]+/, "part="+pnum);
    specurl = specurl.replace(/part=[0-9]+/, "part="+pnum);
    drawdata();
}


