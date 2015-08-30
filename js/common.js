// Becareful because this common.js file is loaded on websites for content_scripts and we don't want errors here

window.onerror = function(msg, url, line) {
	var thisUrl = removeOrigin(url).substr(1); // also remove beginning slash '/'
	var thisLine;
	if (line) {
		thisLine = " (" + line + ") ";
	} else {
		thisLine = " ";
	}
	
	var category = "JS Errors"; 
	var GAError = thisUrl + thisLine + msg;
	var label = navigator.appVersion;
	
	sendGA(category, GAError, label);
	//return false; // false prevents default error handling.
};

//usage: [url] (optional, will use location.href by default)
function removeOrigin(url) {
	var linkObject;
	if (arguments.length && url) {
		try {
			linkObject = document.createElement('a');
			linkObject.href = url;
		} catch (e) {
			console.error("jerror: could not create link object: " + e);
		}
	} else {
		linkObject = location;
	}
	
	if (linkObject) {
		return linkObject.pathname + linkObject.search + linkObject.hash;
	} else {
		return url;
	}
}

function logError(msg, o) {
	try {
		var onErrorMessage;
		if (o) {
			console.error(msg, o);
			onErrorMessage = msg + " " + o;
		} else {
			console.error(msg);
			onErrorMessage = msg;
		}
		window.onerror(onErrorMessage, location.href);
	} catch (e) {
		console.error("error in onerror?", e);
	}
}

var storage;
var storagePromise;

chrome.storage.onChanged.addListener(function(changes, areaName) {
	console.log("storage changed", changes, areaName);
	chrome.storage.local.get(null, function(items) {
		storage = items;
	});
});

function loadStorage() {
	// sort of like singleton/instance here
	if (!storagePromise) {
		storagePromise = new Promise(function(resolve, reject) {
			chrome.storage.local.get(null, function(items) {
				if (chrome.runtime.lastError) {
					console.error(chrome.runtime.lastError.message);
				} else {
					console.log("items", items);
					storage = items;
				}
				resolve(items);
			});
		});
	}
	return storagePromise;
}

function setStorageItem(key, value) {
    var item = {};
    item[key] = value;
	chrome.storage.local.set(item);
}

var ONE_SECOND = 1000;
var ONE_MINUTE = 60000;
var ONE_HOUR = ONE_MINUTE * 60;
var ONE_DAY = ONE_HOUR * 24;

Calendar = function () {};

if (typeof(jQuery) != "undefined") {
	jQuery.fn.exists = function(){return jQuery(this).length>0;}
}

function seconds(seconds) {
	return seconds * ONE_SECOND;
}

function minutes(minutes) {
	return minutes * ONE_MINUTE;
}

function hours(hours) {
	return hours * ONE_HOUR;
}

function getMessage(messageID, args, localeMessages) {
	// if localeMessage null because english is being used and we haven't loaded the localeMessage
	if (!localeMessages) {
		try {
			localeMessages = chrome.extension.getBackgroundPage().localeMessages;
		} catch (e) {
			// might be in content_script and localMessages not defined because it's in english
			return chrome.i18n.getMessage(messageID, args);
		}				
	}
	if (localeMessages) {
		var messageObj = localeMessages[messageID];	
		if (messageObj) { // found in this language
			var str = messageObj.message;
			
			// patch: replace escaped $$ to just $ (because chrome.i18n.getMessage did it automatically)
			if (str) {
				str = str.replace(/\$\$/g, "$");
			}

			if (args) {
				if (args instanceof Array) {
					for (var a=0; a<args.length; a++) {
						str = str.replace("$" + (a+1), args[a]);
					}
				} else {
					str = str.replace("$1", args);
				}
			}
			return str;
		} else { // default to default language
			return chrome.i18n.getMessage(messageID, args);
		}
	} else {
		return chrome.i18n.getMessage(messageID, args);
	}
}

function analytics() {
	setTimeout(function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = '/js/analytics.js';
		// changed append logic a bit because we are in an html import context now
		var s = document.getElementsByTagName('head')[0]; s.appendChild(ga, s);
	}, location.href.indexOf("background.") != -1 ? 0 : 500);
	
	$(document).ready(function() {
		$("a, input, button").on("click", function() {
			var id = $(this).attr("ga");
			var label = null;
			if (id != "IGNORE") {
				if (!id) {
					id = $(this).attr("id");
				}
				if (!id) {
					id = $(this).attr("snoozeInMinutes");
					if (id) {
						label = "in minutes: " + id; 
						id = "snooze";
					}
					if (!id) {
						id = $(this).attr("snoozeInDays");
						if (id) {
							label = "in days: " + id; 
							id = "snooze";
						}
					}
					if (!id) {
						id = $(this).attr("msg");
					}
					if (!id) {
						id = $(this).attr("msgTitle");
					}
					if (!id) {
						id = $(this).attr("href");
						// don't log # so dismiss it
						if (id == "#") {
							id = null;
						}
					}
					if (id) {
						id = id.replace(/javascript\:/, "");
						// only semicolon so remove it and keep finding other ids
						if (id == ";") {
							id = "";
						}
					}
					if (!id) {
						id = $(this).parent().attr("id");
					}		
				}
				if ($(this).attr("type") != "text") {
					if ($(this).attr("type") == "checkbox") {
						if (this.checked) {
							label = id + "_on";
						} else {
							label = id + "_off";
						}
					}
					var category = $(this).parents("*[gaCategory]");
					var action = null;
					// if gaCategory specified
					if (category.length != 0) {
						category = category.attr("gaCategory");
						action = id;
					} else {
						category = id;
						action = "click";
					}
					
					if (label != null) {
						sendGA(category, action, label);
					} else {
						sendGA(category, action);
					}
				}
			}
		});
	});
}

//usage: niceAlert(message, [params], [callback])
function niceAlert(message, params, callback) {
	console.log("args", arguments);
	if (arguments.length == 1) {
		params = {};
	} else if (arguments.length == 2) {
		// if 2nd param is function then assume it's
		if ($.isFunction(params)) {
			callback = params;
			params = {};
		} else if (!params) {
			params = {};
		}
	}
	if (!callback) {
		callback = function() {};
	}
	
	var $style = $("<style>" +
			" #jBackDrop {opacity:0;position: fixed;top: 0;right: 0;bottom: 0;left: 0;z-index: 1030;background-color: #000}" +
			" #jMessage {position: fixed;opacity:0;top:30%;right: 0;bottom: 0;left: 0;z-index: 1040}" +
			" #jMessageInner {border:1px solid black;text-align: center;box-shadow: 0 5px 15px rgba(0,0,0,0.5);right: auto;left: 50%;width:400px;z-index: 1050;background:white;border-radius:9px;padding:15px;margin-right: auto;margin-left: auto}" +
			" #jMessageClose {float:right;margin-right: -5px;margin-top: -6px;cursor:pointer;font-size: 21px;font-weight: bold;line-height: 1;color: #000;text-shadow: 0 1px 0 #fff;opacity: .2} " +
			" #jMessageClose:hover {opacity:0.5} " +
			" #jMessageText {color: black;text-align: left;margin: 15px 10px 20px 10px} " +
			" #jMessage .jMessageButton {color: #fff;background: #428bca;border-color: #357ebd;padding: 6px 12px;margin:0 0 0 10px;font-size: 14px;font-weight: normal;line-height: 1.428571429;text-align: center;white-space: nowrap;vertical-align: middle;cursor: pointer;border: 1px solid transparent;border-radius: 4px;-webkit-user-select: none} " +
			" #jMessage .jMessageButton:hover {background:#3276b1} " +
			" #jMessage .jMessageButton:focus {outline:none} " +
			" #jMessage #jMessageCancelButton {background:#aaa}" +
			" #jMessage #jMessageCancelButton:hover {background:#999} " +
			"</style>");
	
	var $backDrop = $("<div id='jBackDrop'></div>");
	$("head").append($style);
	$("body").append($backDrop);
	
	var $messageDiv;
	
	function closeAlert(action, callback) {
		$backDrop.animate({ opacity: 0 }, 200, function() {
			$messageDiv.remove();
			$(this).remove();
			$style.remove();
			callback(action);
		});
	}
	
	$backDrop.animate({ opacity: 0.5 }, 200, function() {
		$messageDiv = $("<div id='jMessage'><div id='jMessageInner'><div id='jMessageClose'>×</div><div id='jMessageText'></div><div id='jMessageButtonArea'><button id='jMessageOKButton' class='jMessageButton'>OK</button></div></div></div>");		
		$messageDiv.find("#jMessageText").html(message);
		
		if (params.cancelButton) {
			$messageDiv.find("#jMessageButtonArea").append( $("<button id='jMessageCancelButton' class='jMessageButton'>Cancel</button>") );
		}

		if (params.okButtonLabel) {
			$messageDiv.find("#jMessageOKButton").text( params.okButtonLabel );
		}

		$messageDiv.find("#jMessageOKButton")
			.click(function() {
				$messageDiv.hide();
				closeAlert("ok", callback);
			})
			.on('keyup', function (e) {
				if (e.which == 27) {
					$("#jMessageClose").click();
				}
			})
		;
		
		$messageDiv.find("#jMessageCancelButton, #jMessageClose")
			.click(function() {
				$messageDiv.fadeOut("fast");
				closeAlert("cancel", callback);
			})
		;		
		
		$backDrop.before($messageDiv);
		
		$messageDiv.animate({ opacity: 1 }, 200, function() {
			$messageDiv.find("#jMessageOKButton").focus();
		});
	});
}

//usage: sendGA('category', 'action', 'label');
//usage: sendGA('category', 'action', 'label', value);  // value is a number.
//usage: sendGA('category', 'action', {'nonInteraction': 1});
function sendGA(category, action, label, etc) {
	console.log("%csendGA: " + category + " " + action + " " + label, "font-size:0.6em");

	// patch: seems arguments isn't really an array so let's create one from it
	var argumentsArray = [].splice.call(arguments, 0);

	var gaArgs = ['send', 'event'];
	// append other arguments
	gaArgs = gaArgs.concat(argumentsArray);
	
	// send to google
	if (window.ga) {
		ga.apply(this, gaArgs);
	}
}

function getPaypalLC() {
	var locale = window.navigator.language;
	var lang = null;
	if (locale) {
		if (locale.match(/zh/i)) {
			lang = "CN"; 
		} else if (locale.match(/_GB/i)) {
			lang = "GB";
		} else if (locale.match(/ja/i)) {
			lang = "JP";
		} else {
			lang = locale.substring(0,2);
		}
		return lang;
	}
}

function loadCalendarJS(lang) {
	document.write(unescape("%3Cscript src='js/calendar/calendar-" + lang + ".js' type='text/javascript'%3E%3C/script%3E"));
}

if (document.location.href.indexOf("chrome-extension://") != -1) {
	var lang = "en";			
	if (window.navigator.language) {
		lang = window.navigator.language.substring(0, 2);
	}
	
	if (typeof($) != "undefined") {
		$(document).ready(function() {
			loadStorage().then(function() {
				// For some reason including scripts for popup window slows down popup window reaction time, so only found that settimeout would work
				if (document.location.href.indexOf("popup.html") != -1) {
					setTimeout(function() {
						analytics();
					}, 1);
				} else {
					analytics();
				}				
				initMessages();
				initPrefAttributes();
				initOptions();
			});
		});
	}
}

function parseURL(url) {
    var a =  document.createElement('a');
    a.href = url;
    return {
        source: url,
        protocol: a.protocol.replace(':',''),
        host: a.hostname,
        port: a.port,
        query: a.search,
        params: (function(){
            var ret = {},
                seg = a.search.replace(/^\?/,'').split('&'),
                len = seg.length, i = 0, s;
            for (;i<len;i++) {
                if (!seg[i]) { continue; }
                s = seg[i].split('=');
                ret[s[0]] = s[1];
            }
            return ret;
        })(),
        file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
        hash: a.hash.replace('#',''),
        path: a.pathname.replace(/^([^\/])/,'/$1'),
        relative: (a.href.match(/tp:\/\/[^\/]+(.+)/) || [,''])[1],
        segments: a.pathname.replace(/^\//,'').split('/')
    };
}

function log(str, prefName) {
	if (pref(prefName)) {
		console.log(str);
	}
}

function getProtocol() {
	return pref("ssl2", true) ? "https" : "http";
}

function initOptions() {
	$("*[opensOptions]").each(function(index) {
		var optionsID = $(this).attr("opensOptions");
		// Show or hide options at startup
		var options = $("#" + optionsID);
		options.toggle(this.checked);
		// Bind function to show/hide options
		$(this).change(function() {
			options.slideToggle(this.checked);
		});
	});
}

function initPrefAttributes() {
	$("select[pref], input[pref]").each(function(index) {
		var prefValue;
		if ($(this).attr("default")) {
			if ($(this).attr("default") == "true") {
				prefValue = pref($(this).attr("pref"), true);
			} else {
				prefValue = pref($(this).attr("pref"), $(this).attr("default"));
			}
		} else {
			prefValue = pref($(this).attr("pref"));
		}
		if (this.tagName == "INPUT") {
			if ($(this).attr("type") == "checkbox") {
				$(this).attr("checked", prefValue);
				$(this).change(function(event) {
					changePref(this, this.checked, event);
				});
			} else if ($(this).attr("type") == "radio") {
				if ($(this).val() == prefValue) {
					$(this).attr("checked", "true");
				}				
				$(this).change(function(event) {
					changePref(this, $(this).val(), event);
				});
			} else if ($(this).attr("type") == "text") {
				$(this).keyup(function() {
					changePref(this, $(this).val(), event);
				});
			}
		} else if (this.tagName == "SELECT") {
			$(this).val(prefValue);
			$(this).change(function() {
				changePref(this, $(this).val(), event);
			});
		}
		$(this).click(function(event) {
			if ($(this).attr("mustDonate") && !pref("donationClicked")) {
				event.preventDefault();
			}
		});
	});
}

function changePref(node, value, event) {
	if (!$(node).attr("mustDonate") || ($(node).attr("mustDonate") && donationClicked($(node).attr("pref")))) {
		setStorageItem($(node).attr("pref"), value);
		return true;
	} else {
		// preventDefault() does not work on the "change" event, only the "click" event so revert checkbox state instead
		//event.preventDefault();		
		/*
		if (node.tagName == "INPUT") {
			node.checked = !node.checked;
		}
		*/
		return false;
	}	
}

function initMessages(node) {
	var selector;
	if (node) {
		selector = node;
	} else {
		selector = "*";
	}
	$(selector).each(function() {
		//var parentMsg = $(this);
		var attr = $(this).attr("msg");
		if (attr) {
			var msgArg1 = $(this).attr("msgArg1");
			if (msgArg1) {
				$(this).text(chrome.i18n.getMessage( $(this).attr("msg"), msgArg1 ));
			} else {
				// look for inner msg nodes to replace before...
				var innerMsg = $(this).find("*[msg]");
				if (innerMsg.exists()) {
					//console.log("inside: ", innerMsg);
					initMessages(innerMsg);
					var msgArgs = new Array();
					innerMsg.each(function(index, element) {
						msgArgs.push( $(this).get(0).outerHTML );
					});
					//console.log("msgargs: ", msgArgs);
					//console.log("attr: ", attr);
					//console.log("html: ", chrome.i18n.getMessage(attr, msgArgs))
					$(this).html(chrome.i18n.getMessage(attr, msgArgs));
					//return false;
				} else {
					$(this).text(chrome.i18n.getMessage(attr));
				}
			}
		}
		attr = $(this).attr("msgTitle");
		if (attr) {
			$(this).attr("title", chrome.i18n.getMessage(attr));
		}
		attr = $(this).attr("msgSrc");
		if (attr) {
			$(this).attr("src", chrome.i18n.getMessage(attr));
		}
		attr = $(this).attr("msgValue");
		if (attr) {
			$(this).attr("value", chrome.i18n.getMessage(attr));
		}
		attr = $(this).attr("msgPlaceholder");
		if (attr) {
			$(this).attr("placeholder", getMessage(attr));
		}
		attr = $(this).attr("msgHTML");
		if (attr) {
			$(this).html(getMessage(attr));
		}
		
	});
	/*
	$("*[msg]").each(function() {
		var msgArg1 = $(this).attr("msgArg1");
		if (msgArg1) {
			$(this).text(chrome.i18n.getMessage( $(this).attr("msg"), msgArg1 ));
		} else {
			var node1 = $(this).find("msgNode1");
			if (node1.exists()) {
				
			} else {
				$(this).text(chrome.i18n.getMessage( $(this).attr("msg") ));
			}
		}
	});
	$("*[msgTitle]").each(function() {
		$(this).attr("title", chrome.i18n.getMessage( $(this).attr("msgTitle") ));
	});
	$("*[msgSrc]").each(function() {
		$(this).attr("src", chrome.i18n.getMessage( $(this).attr("msgSrc") ));
	});
	$("*[msgValue]").each(function() {
		$(this).attr("value", chrome.i18n.getMessage( $(this).attr("msgValue") ));
	});
	*/
}

function donationClicked(action, storage) {
	// not passed then get global storage object
	if (!storage) {
		storage = window.storage;
	}
	if (storage.donationClicked) {
		return true;
	} else {
		var url = "donate.html?action=" + action;
		try {
			chrome.tabs.create({url:url});
		} catch (e) {
			// Must be in a content_script or somewhere chrome.tabs.create cannot be called so send call to background.js
			chrome.runtime.sendMessage({name: "openTab", url:url}, function(response) {});
		}
		return false;
	}
}

function parseTime(timeString, date) {    
    if (!timeString) return null;
	timeString = timeString.toLowerCase();
    var time = timeString.match(/(\d+)(:(\d\d))?\s*(a?p?)/i); 
    if (time == null) return null;
    var hours = parseInt(time[1],10);    
    if (hours == 12) {
		// Assume noon not midnight if no existant AM/PM
		if (!time[4] || time[4] == "p") {
			hours = 12;
		} else {
			hours = 0;
		}
    } else {
        hours += (hours < 12 && time[4] == "p") ? 12 : 0;
    }
    var d = new Date();
    if (date) {
    	d = date;
    }
    d.setHours(hours);
    d.setMinutes(parseInt(time[3],10) || 0);
    d.setSeconds(0, 0);  
    return d;
}

function findElementByAttribute(array, attributeName, attributeValue) {
	for (a in array) {
		if (array[a][attributeName] == attributeValue) {
			return array[a];
		}
	}
}

function selectOrCreateTab(findUrlStr, urlToOpen, callback) {
	chrome.windows.getAll({populate:true}, function (windows) {
		for(var a=0; a<windows.length; a++) {
			var tabs = windows[a].tabs;
			for(var b=0; b<tabs.length; b++) {
				if (tabs[b].url.indexOf(findUrlStr) != -1) {
					// Uncomment this once the Chrome maximize bug is resolved: https://code.google.com/p/chromium/issues/detail?id=65371
					//chrome.windows.update(windows[a].id, {left:windows[a].left, width:windows[a].width, focused:true}, function() {
						chrome.tabs.update(tabs[b].id, { selected: true });
						callback({found:true, tab:tabs[b]});
					//});
					return true;
				}
			}
		}
		chrome.tabs.create({url: urlToOpen}, function(tab) {
			callback({found:false, tab:tab});			
		});
		return false;
	});
}

function removeNode(id) {
	var o = document.getElementById(id);
	if (o) {
		o.parentNode.removeChild(o);
	}
}

function addCSS(id, css) {
	removeNode(id);
	var s = document.createElement('style');
	s.setAttribute('id', id);
	s.setAttribute('type', 'text/css');
	s.appendChild(document.createTextNode(css));
	(document.getElementsByTagName('head')[0] || document.documentElement).appendChild(s);
}

function pad(str, times, character) { 
	var s = str.toString();
	var pd = '';
	var ch = character ? character : ' ';
	if (times > s.length) { 
		for (var i=0; i < (times-s.length); i++) { 
			pd += ch; 
		}
	}
	return pd + str.toString();
}

function getBrowserVersion() {
	// Browser name = Chrome, Full version = 4.1.249.1064, Major version = 4, navigator.appName = Netscape, navigator.userAgent = Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) AppleWebKit/532.5 (KHTML, like Gecko) Chrome/4.1.249.1064 Safari/532.5
	//																															  Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) AppleWebKit/533.4 (KHTML, like Gecko) Chrome/5.0.375.38 Safari/533.4
	var agent = navigator.userAgent;
	var offset = agent.indexOf("Chrome");
	var version = null;
	if (offset != -1) {
		version = agent.substring(offset+7);
		offset = version.indexOf(";");
		if (offset != -1) {
			version = version.substring(0, offset);
		}
		offset = version.indexOf(" ");
		if (offset != -1) {
			version = version.substring(0, offset);
		}
	}
	if (version) {
		return parseFloat(version);
	}
}

function toBool(str) {
	if ("false" === str || str == undefined) {
		return false;
	} else if ("true" === str) {
		return true;
	} else {
		return str;
	}
}

// This pref function is different*** we pass either just the param to localStorage[param] or the value of localStorage["example"]
function pref(param, defaultValue, ls) {
	var value;
	if (ls) {
		value = ls[param];
	} else {
		value = storage[param];
	}
	if (defaultValue == undefined) {
		defaultValue = false;
	}
	return value == null ? defaultValue : toBool(value);
}

function getUrlValue(url, name, unescapeFlag) {
    var hash;
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    for(var i=0; i<hashes.length; i++) {
        hash = hashes[i].split('=');
		if (hash[0] == name) {
			if (unescapeFlag) {
				return unescape(hash[1]);
			} else {
				return hash[1];
			}
		}
    }
    return null;
}

function addUrlParam(url, name, value) {
	if (url) {
		var urlStart = url;
		if (url.indexOf("?") != -1) {
			urlStart += "&";
		} else {
			urlStart += "?";
		}
		return urlStart + name + "=" + value;
	}
	return null;
}

function getCookie(c_name) {
	if (document.cookie.length>0) {
	  c_start=document.cookie.indexOf(c_name + "=");
	  if (c_start!=-1) {
	    c_start=c_start + c_name.length+1;
	    c_end=document.cookie.indexOf(";",c_start);
	    if (c_end==-1) c_end=document.cookie.length;
	    return unescape(document.cookie.substring(c_start,c_end));
	    }
	  }
	return "";
}

// Usage: getManifest(function(manifest) { display(manifest.version) });
function getManifest(callback) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		callback(JSON.parse(xhr.responseText));
	};
	xhr.open('GET', './manifest.json', true);
	xhr.send(null);
}

function getExtensionIDFromURL(url) {
	//"chrome-extension://dlkpjianaefoochoggnjdmapfddblocd/options.html"
	return url.split("/")[2]; 
}

function getStatus(request, textStatus) {
	var status; // status/textStatus combos are: 201/success, 401/error, undefined/timeout
	try {
		status = request.status;
	} catch (e) {
		status = textStatus;
	}
	return status;
}

function now() {
	return today().getTime();
}

function today() {
	var offsetToday = localStorage["today"];
	if (offsetToday) {
		return new Date(offsetToday);
	} else {
		return new Date();
	}
}

function setTodayOffsetInDays(days) {
	var offset = today();
	offset.setDate(offset.getDate()+parseInt(days));
	localStorage["today"] = offset;
}

function clearTodayOffset() {
	localStorage.removeItem("today");
}

function isToday(date) {
	return date.getFullYear() == today().getFullYear() && date.getMonth() == today().getMonth() && date.getDate() == today().getDate();
}

function isTomorrow(date) {
	var tomorrow = today();
	tomorrow.setDate(tomorrow.getDate()+1);
	return date.getFullYear() == tomorrow.getFullYear() && date.getMonth() == tomorrow.getMonth() && date.getDate() == tomorrow.getDate();
}

function isYesterday(date) {
	var tomorrow = today();
	tomorrow.setDate(tomorrow.getDate()-1);
	return date.getFullYear() == tomorrow.getFullYear() && date.getMonth() == tomorrow.getMonth() && date.getDate() == tomorrow.getDate();
}

Date.prototype.isToday = function () {
	return isToday(this);
};

Date.prototype.isTomorrow = function () {
	return isTomorrow(this);
};

Date.prototype.isYesterday = function () {
	return isYesterday(this);
};

Date.prototype.diffInDays = function(otherDate) {
	var d1;
	if (otherDate) {
		d1 = new Date(otherDate);
	} else {
		d1 = today();
	}	
	d1.setHours(1);
	d1.setMinutes(1);
	var d2 = new Date(this);
	d2.setHours(1);
	d2.setMinutes(1);
	return Math.round(Math.ceil(d2.getTime() - d1.getTime()) / ONE_DAY);
};

function addToArray(str, ary) {
	for (a in ary) {
		if (ary[a] == str) {
			return false;
		}
	}
	ary.push(str);
	return true;
}

function removeFromArray(str, ary) {
	for (var a=0; a<ary.length; a++) {
		if (ary[a] == str) {
			ary.splice(a, 1);
			return true;
		}
	}
	return false;
}

function isInArray(str, ary) {
	for (a in ary) {
		if (ary[a] == str) {
			return true;
		}
	}
	return false;
}

var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNamesShort[D],
				dddd: dF.i18n.dayNames[D],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNamesShort[m],
				mmmm: dF.i18n.monthNames[m],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};

dateFormat.i18nEnglish = dateFormat.i18n;  

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

Date.prototype.formattedTime = function () {
	if (pref("24hourMode")) {
		return dateFormat(this, "HH:MM");
	} else {
		return dateFormat(this, "h:MMtt");
	}
};

function findTag(str, name) {
	if (str) {
		var index = str.indexOf("<" + name + " ");
		if (index == -1) {
			index = str.indexOf("<" + name + ">");
		}
		if (index == -1) {
			return null;
		}
		var closingTag = "</" + name + ">";
		var index2 = str.indexOf(closingTag);
		return str.substring(index, index2 + closingTag.length);
	}
}

function tweet(url, msg, via) {	
	var langParam = window.navigator.language.substring(0, 2);
	var popupUrl = "http://twitter.com/intent/tweet?url=" + encodeURIComponent(url) + "&lang=" + langParam;
	if (msg) {
		popupUrl += "&text=" + escape(msg);
	}	
	if (via) {
		popupUrl += "&via=" + via;
	}
	if (!window.open(popupUrl, 'tweet', 'toolbar=0,status=0,resizable=1,width=626,height=256')) {
		chrome.tabs.create({url:popupUrl});
	}
}

function facebookShare(url, msg) {	
	var popupUrl = "http://www.facebook.com/sharer.php?u=" + encodeURIComponent(url);
	if (msg) {
		popupUrl += "&t=" + escape(msg);
	}	
	if (!window.open(popupUrl, 'facebookShare', 'toolbar=0,status=0,resizable=1,width=626,height=356')) {
		chrome.tabs.create({url:popupUrl});
	}
}

//return 1st active tab
function getActiveTab(callback) {
	chrome.tabs.query({'active': true}, function(tabs) {
		if (tabs) {
			callback(tabs[0]);
		} else {
			callback();
		}
	});
}

function daysElapsedSinceFirstInstalled() {
	return Math.abs(new Date(storage.installDate).diffInDays());
}

function isEligibleForReducedDonation() {
	return (daysElapsedSinceFirstInstalled() >= (40) && !pref("donationClicked"));
}

function Controller() {
	
	// apps.jasonsavard.com server
	Controller.FULLPATH_TO_PAYMENT_FOLDERS = "https://apps.jasonsavard.com/";
	
	// jasonsavard.com server
	//Controller.FULLPATH_TO_PAYMENT_FOLDERS = "https://jasonsavard.com/apps.jasonsavard.com/";

	// internal only for now
	function callAjaxController(params) {
		$.ajax({
			type: "GET",
			url: Controller.FULLPATH_TO_PAYMENT_FOLDERS + "controller.php",
			headers: {"misc":location.href},
			data: params.data,
			dataType: "jsonp",
			jsonp: "jsoncallback",
			timeout: seconds(5),
			success: params.success,
			error: params.error
		});
	}

	Controller.ajax = function(params, callback) {
		callAjaxController({
			data: params.data,
			success: function(data, textStatus, jqXHR) {
				callback({data:data, textStatus:textStatus, jqXHR:jqXHR});
			},
			error: function(jqXHR, textStatus, errorThrown) {
				callback({error: "jasonerror thrown from controller: " + textStatus + " " + errorThrown, jqXHR:jqXHR, textStatus:textStatus, errorThrown:errorThrown});
			}
		});
	}
	
	Controller.verifyPayment = function(itemID, emails, callback) {
		callAjaxController({
			data: {action:"verifyPayment", name:itemID, email:emails}, //bg.email
			success: function(data, textStatus, jqXHR) {
				callback(data);
			},
			error: function() {
				callback({error: "jasonerror thrown from controller"});
			}						
		});
	}

	Controller.email = function(params, callback) {
		
		if (!callback) {
			callback = function() {};
		}

		// append action to params
		params.action = "email";
		
		callAjaxController({
			data: params,
			success: function(data, textStatus, jqXHR) {
				callback(data);
			},
			error: function() {
				callback({error: "jasonerror thrown from controller"});
			}						
		});
	}
}

function showLoading() {
	var $img = $("<img id='ajaxLoader' src='/images/ajax-loader-big.gif' style='position:fixed;display:none;top:272px;left:48%'/>");
	$("body").append($img);
	$img.fadeIn("slow");
}

function hideLoading() {
	$("#ajaxLoader").remove();
}