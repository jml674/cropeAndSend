var startY = 150;
var i = 0;
var docHeight = 0;
var winHeight = 0;
var winWidth = 0;

var doc;
var frame;

chrome.runtime.onMessage.addListener(function(message, sender, response) {
	switch(message.msg) {
		case "scroll_init":
			if (false && document.location.hostname == "mail.google.com") {
				frame = true;
				doc = document.getElementById("canvas_frame").contentDocument;
			} else {
				doc = document;
			}
			docHeight = doc.body.scrollHeight;
			winHeight = window.innerHeight;
			winWidth = window.innerWidth;
			startY = window.scrollY;
			window.scrollTo(0,0);
			i = 0;
			setTimeout(function() {
				response({height:docHeight, width:winWidth});
			}, 300);
			//setTimeout("sendMessage({msg:'scroll_init_done', height:"+ docHeight +", width:"+ winWidth +"});", 300);
			
			break;
		case "scroll_next":
			i++;
			if(i*winHeight < docHeight) {
				if (frame) {
					doc.body.scrollTop = i * winHeight;
				} else {
					window.scrollTo(0, i * winHeight);
				}				
				setTimeout(function() {
					response({msg:'scroll_next_done'});
				}, 300);
				//"sendMessage({msg:'scroll_next_done'});", 300);
			} else {
				if (frame) {
					doc.body.scrollTop = startY;
				} else {
					window.scrollTo(0, startY);
				}
				response({msg:'scroll_finished'});
				//sendMessage({msg:'scroll_finished'});
			}
			
			break;
	}
	return true;
});