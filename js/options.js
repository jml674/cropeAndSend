var bg = chrome.extension.getBackgroundPage();

$(document).ready(function() {
	
	try {
		$("title, #title, .title").text(chrome.i18n.getMessage("name"));
	} catch (e) {
		console.error("error getting manifest: " + e);
	}
	
	$("#donate").click(function() {
		location.href = "donate.html?fromOptions=true";
	});
	
	$("#removeMenuItems").change(function() {
		setTimeout(function() {
			initContextMenu();
		}, 500);
	});
});
