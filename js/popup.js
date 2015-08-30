if (!chrome.runtime || !chrome.runtime.getBackgroundPage) {
	chrome.tabs.create({url:"http://jasonsavard.com/wiki/Old_Chrome_version?ref=screenshots"});
}

function showCannotCaptureWarning() {
	$("body").height("200px")
	$("body *:not(#cannotCaptureWarning)").css("opacity", "0.7");
	$("#cannotCaptureWarning").fadeIn();
}

function showError(msg) {
	$("#error")
		.html(msg)
		.slideDown()
	;
}

// try doing this outside of document load because it seems on OS X machines the getactive tab was not working
/*
getActiveTab(function(tab) {
	console.log("tab", tab);
	selectedTab = tab;
	$(document).ready(function() {
		if (!selectedTab.url || selectedTab.url.match("chrome://chrome/")) {
			internalPage = true;
			showCannotCaptureWarning();
			$("#selectedArea").addClass("disabled");
			$("#visibleArea").addClass("disabled");
			$("#entirePage").addClass("disabled");
		} else if (selectedTab.url.indexOf("chrome-extension://") == 0 || selectedTab.url.indexOf("https://chrome.google.com/webstore") == 0 || selectedTab.url.indexOf("about:") == 0) {
			internalPage = true;
			$("#entirePage").addClass("disabled");
		}
	});
});
*/

$(document).ready(function() {
	
	$(".menuitem").click(function() {
		sendGA('popup', $(this).attr("id"));
	});
	
	$("#particularPages").click(function() {
		$("body").css("height", 250);
		$("#particularPagesList").slideDown();
	});
	
	$("#reloadTab").click(function() {
		getActiveTab(function(tab) {
			chrome.tabs.reload(tab.id);
			self.close();
		});
	});
	
	$("#selectedArea").click(function() {
		grabSelectedArea().catch(function() {
			showCannotCaptureWarning();
		});
	});
	
	$("#visibleArea, #justInstalledGrabVisibleArea").click(function() {
		grabVisiblePart().catch(function() {
			showCannotCaptureWarning();
		});
	});

	$("#entirePage").click(function() {
		document.getElementById("grabLinks").style.display = "none";
		document.getElementById("processing").style.display = "block";

		grabEntirePage().catch(function(errorResponse) {
			$("body").css("width", "200px");
			$("#processing, #grabLinks").hide();
			
			$("#justInstalled").slideDown();
			$("#multipleMonitors").slideDown();
			showError("Error: " + errorResponse);
		});
	});

	$("#grabWindow").click(function() {
		$(".instructions").slideUp();
		if (navigator.userAgent.toLowerCase().indexOf('mac') != -1) {
			$("#grabWindowMacInstructions").slideDown();
		} else if (navigator.userAgent.toLowerCase().indexOf('cros') != -1) {
			$("#grabWindowCrOSInstructions").slideDown();
		} else {
			$("#grabWindowInstructions").slideDown();
		}
	});
	
	$("#entireScreen").click(function() {
		$(".instructions").slideUp();
		if (navigator.userAgent.toLowerCase().indexOf('mac') != -1) {
			$("#entireScreenMacInstructions").slideDown();
		} else if (navigator.userAgent.toLowerCase().indexOf('cros') != -1) {
			$("#entireScreenCrOSInstructions").slideDown();
		} else {
			$("#entireScreenWindowsInstructions").slideDown();
		}
	});

	$("#openFile").click(function() {
		chrome.tabs.create({url:"openFile.html"});
		window.close();
	});
	
	$("#openFromClipboard").click(function() {
		openFromClipboard().catch(function(response) {
			if (response.permissionNotGranted) {
				showError("You must grant this minimal permission if you want this extension to grab your screenshot or image from the clipboard!");
			}
		});
	});

	$("#contribute").click(function() {
		chrome.tabs.create({url: 'donate.html?fromPopup'});
	});

	$("#otherExtensions").click(function() {
		chrome.tabs.create({url: 'http://jasonsavard.com?ref=ssPopup'});
	});

	$("#feedback").click(function() {
		chrome.tabs.create({url:"http://jasonsavard.com/forum/categories/explain-and-send-screenshots?ref=SSOptionsMenu"});
		window.close();
	});

	$("#options").click(function() {
		chrome.tabs.create({url:"options.html"});
		window.close();
	});

	$("#aboutMe").click(function() {
		chrome.tabs.create({url:"http://jasonsavard.com/bio?ref=SSOptionsMenu"});
		window.close();
	});

	$("#Help").click(function() {
		chrome.tabs.create({url:"http://jasonsavard.com/wiki/Explain_and_Send_Screenshots"});
		window.close();
	});

	function processClipboardItem(item) {
		return new Promise(function(resolve, reject) {
			if (item.kind == "file") {
				var fileName = item.name;
				var fileType = item.type;
		  		console.log("mimetype", JSON.stringify(item)); // will give you the mime types
		  		var blob = item.getAsFile();
		  		var reader = new FileReader();
		  		reader.onload = function(event) {
		  			//uploadImage(fileName, fileType, event.target.result, $contentEditable);
		  			resolve({fileName:fileName, fileType:fileType, dataUrl:event.target.result});
		  		};
		  		reader.readAsDataURL(blob);
			} else if (item.kind == "string") {
				// when i paste text, type=text/plain
				// when i copy/paste from paint it's a file with type=image/png
				// when i right click and "Copy image" type=text/html
				if (item.type == "text/html") {
					item.getAsString(function(s) {
						// returns this:   <html><body><xxStartFragmentxx><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAA...2EpZhOpUxE7OGFwX1dzxv3vX5ufsAUAFABQAUAFABQAUAFABQB//Z"/><xxEndFragmentxx></body></html> 
						//console.log("getasstring:", s);
						var $div = $("<div></div>");
						$div.append(s);
						var dataUrl = $div.find("img").attr("src");

						if (dataUrl.indexOf("data:") == 0) {
							console.log("data: found");
							resolve({dataUrl:dataUrl});
						} else {
							resolve({couldNotProcessReason:"Can't process url: " + dataUrl});
						}
					});
				} else if (item.type == "text/plain") {
					item.getAsString(function(s) {
						if (s.indexOf("http") == 0) {
							resolve({urlWasCopied:true, url:s});
						} else {
							resolve({couldNotProcessReason:"Could not parse this text/plain: " + s});
						}
					});
				} else {
					resolve({couldNotProcessReason:"Could not determine item.type: " + item.type});
				}
			} else {
				resolve({couldNotProcessReason:"Could not determine item.kind: " + item.kind});
			}
		});
	}
	
	$("body").on("paste", function(e) {
		console.log("paste");
		var items = (event.clipboardData || event.originalEvent.clipboardData).items;
		
		var promises = [];
		for (var a=0; a<items.length; a++) {
			var promise = processClipboardItem(items[a]);
			promises.push(promise);
		}
		
		Promise.all(promises).then(function(promisesResponse) {
			var success = false;
			var urlWasCopied = false;
			var errors = [];
			promisesResponse.some(function(promiseResponse, index) {
				if (promiseResponse.couldNotProcessReason) {
					var error = "item " + index + " " + promiseResponse.couldNotProcessReason;
					errors.push(error);
					console.log(error);
				} else if (promiseResponse.urlWasCopied) {
					urlWasCopied = true;
					$("#imageFromUrl").attr("href", promiseResponse.url);
					$("#urlWasCopied").slideDown();
				} else {
					console.log("item " + index, promiseResponse);
					openEditor(promiseResponse.dataUrl);
					success = true;
					return true;
				}
			});
			if (!success && !urlWasCopied) {
				showError("No images in clipboard!<br><br>Try right clicking on an image and select <b style='white-space:nowrap'>Copy image</b>");
			}
		}).catch(function(errorResponse) {
			showError(errorResponse);
		});

	});

});