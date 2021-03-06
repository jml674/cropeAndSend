var canvas = "";
var ctx;
var cy = 0;
var SCROLLBAR_WIDTH = 22;
var screenShotTab = null;
var screenShotData = null;
var scrolledX=-1;
var scrolledY = -1;
						

function captureRecursively(tab, callback) {
	console.log("captrecur")
	captureToCanvas(function() {
		console.log("sendnext")
		chrome.tabs.sendMessage(tab.id, {msg:"scroll_next"}, function(response) {
			if (response.msg == "scroll_next_done") {
				console.log("sendnextdone")
				captureRecursively(tab, callback);
			} else {
				console.log("finish")
				callback();
			}
		});
	});
}

function captureToCanvas(callback) {
	chrome.tabs.captureVisibleTab(null, {format:"png"}, function(data) {
		var image = new Image();
		console.log("capture");
		image.onload = function() {
			console.log("image loaded: " + cy);			
			console.log("image loaded: " + image.height);
			console.log("image loaded: " + canvas.height);
			var height = (cy+image.height > canvas.height) ? canvas.height-cy : image.height;
			console.log("height: " + height);
			console.log("width: " + image.width);
			if(height > 0) {
				console.log("ctx drawimage: ", image, canvas);
				ctx.drawImage(image, 0, image.height-height, image.width-SCROLLBAR_WIDTH, height, 0, cy, canvas.width-SCROLLBAR_WIDTH, height);
			}
			cy += image.height;
			callback();
		};
		image.src = data;
	});
}

var tabInjected=[];

function captureVisibleTab(urlToGoAfter) {
	return new Promise(function(resolve, reject) {
		chrome.tabs.captureVisibleTab(null, {format:"png"}, function(data) {
			if (data) {
				chrome.runtime.getBackgroundPage(function(bg) {
					getActiveTab(function(tab) {
						screenShotTab = tab;
						screenShotData = data;

						//chrome.tabs.create({url: urlToGoAfter});
						//resolve();
						if (tabInjected[tab]){
							resolve();
						}
						else{
								tabInjected[tab]=true;
								return injectScripts();
						}
					});
				});
			} else {
				reject();
			}
		});
	});
}

function injectScripts(){
	return new Promise(function(resolve, reject) {

		chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT },function(tabs){
		  var id = tabs[0].id;
			var array_css=["css/common.css","css/jquery-ui-1.8.custom.css","css/jquery.Jcrop.css"];
			  Utils.executeCssFromFile(id,array_css);
				var array_scripts=["js/jquery.min.js","js/jquery-ui-1.8.custom.min.js",
							"js/jquery.Jcrop.js","js/common.js" ,"vendor/mandrill.min.js",
							"js/snapshot.js"
					];
			  Utils.executeScriptFromFile(id,array_scripts);
				resolve();
		});
	});
}

function grabSelectedArea() {
	localStorage.grabMethod = "selectedArea";
	console.log("entering grabSelectedArea ...");
	return captureVisibleTab("snapshot.html");
}

function grabVisiblePart() {
	localStorage.grabMethod = "visibleArea";
	return captureVisibleTab("editor.html");
}

function grabEntirePage() {
	return new Promise(function(resolve, reject) {
		localStorage.grabMethod = "entirePage";
		
		getActiveTab(function(tab) {
			var sendMessageResponded = false;
			
			chrome.tabs.executeScript(tab.id, {file:"js/contentScript.js"}, function() {
	
				if (chrome.extension.lastError) {
					console.error("error", chrome.extension.lastError.message);
					reject(chrome.extension.lastError.message);
				} else {					
					chrome.tabs.sendMessage(tab.id, {msg:"scroll_init"}, function(response) {
						sendMessageResponded = true;
						
						canvas = document.createElement('canvas');
						ctx = canvas.getContext("2d");
						console.log("original: " + response.width + " " + response.height);
						canvas.width = response.width;
						canvas.height = response.height;
						cy = 0;
						
						captureRecursively(tab, function() {
							chrome.runtime.getBackgroundPage(function(bg) {
								console.log("canvas: "); // + canvas.toDataURL())
								bg.screenShotTab = tab;
								bg.screenShotData = canvas.toDataURL();
								chrome.tabs.create({url: 'editor.html'});
								resolve();
							});
						});
	
					});
				}
				
			});
	
			setTimeout(function() {
				if (!sendMessageResponded) {
					reject("no sendMessageResponded");
				}
			}, 500);
	
		});
	});
}

function openEditor(dataUrl, sameWindow) {
	chrome.runtime.getBackgroundPage(function(bg) {
		bg.screenShotData = dataUrl;
		if (sameWindow) {
			location.href = "editor.html";
		} else {
			chrome.tabs.create({url: "editor.html"});
		}
	});
}

function openFromClipboard() {
	return new Promise(function(resolve, reject) {
		localStorage.grabMethod = "openFromClipboard";
		
		chrome.permissions.request({permissions: ["clipboardRead"]}, function(granted) {
			if (granted) {
				document.execCommand("paste");
				resolve();
			} else {
				// do nothing
				reject({permissionNotGranted:true});
		  	}
		});
	});
}

function initContextMenu() {
	loadStorage().then(function() {
		chrome.contextMenus.removeAll();
		
		if (storage.removeMenuItems) {
			// nothing
		} else {
			chrome.contextMenus.create({id: "grabSelectedArea", title: getMessage("grabSelectedArea"), contexts: ["page"]});
			chrome.contextMenus.create({id: "grabVisiblePart", title: getMessage("grabVisiblePart"), contexts: ["page"]});
			chrome.contextMenus.create({id: "grabEntirePage", title: getMessage("grabEntirePage"), contexts: ["page"]});
		}
	});
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.action == "tabReady"){
     	sendResponse({screenShotTab: screenShotTab , screenShotData:screenShotData, clickAndDragLabel: chrome.i18n.getMessage("clickAndDrag")});
		}
	}
);

