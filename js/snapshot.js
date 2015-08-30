var screenShotTab;
var screenShotData;

function overlayOnSelect(c) {
	//console.log("onseelectt: " + c.w);
	if (c.w == 0 && c.h == 0) {
    close();
		//overlayOnChange(c);
	} else {
		$("#SS_ClickAndDragText").hide();
		var canvas = document.getElementById('SS_Canvas');
		canvas.width = c.w;
		canvas.height = c.h;
		var context = canvas.getContext('2d');
		var overlayImage = document.getElementById("SS_OverlayImage");
		// Crop and resize the image: sx, sy, sw, sh, dx, dy, dw, dh.
		context.drawImage(overlayImage, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
		screenShotData = canvas.toDataURL(); // default is png
		sendSnapshot(screenShotData);
		/*
		chrome.runtime.getBackgroundPage(function(bg) {
			bg.screenShotTab = screenShotTab;
			bg.screenShotData = screenShotData;
			location.href = "editor.html";
		});
		*/
	}
}

function overlayOnChange(c) {
	//console.log('onchangge');
	$("#SS_ClickAndDragText").show();
	$("#SS_Dialog").dialog("destroy");
}

function init() {
	console.log("init")
	$("#SS_Overlay").mousemove(function(e) {
		$("#SS_ClickAndDragText").css({
			top: (e.pageY + 15) + "px",
			left: (e.pageX + 15) + "px"
		});
	});
	console.log("init2")
	$('#SS_OverlayImage').attr("src", screenShotData);
	console.log("init3")
	$('#SS_OverlayImage').on("load", function() {
		$("#SS_Overlay").show();
		console.log("init4")
		setTimeout(function() {
			console.log("init5")
			$('#SS_OverlayImage').Jcrop({
				setSelect: [ -100, -100, -100, -100 ],
				onSelect: overlayOnSelect,
				onChange: overlayOnChange
			});
		}, 1);
	});
}

$(document).ready(function() {			
	chrome.runtime.getBackgroundPage(function(bg) {
		screenShotTab = bg.screenShotTab;
		screenShotData = bg.screenShotData;
		$("body").css("background-image", "url('" + screenShotData + "')");
		init();
		setTimeout(function() {
			//init();
		}, 1);
	});
});