var screenShotTab;
var screenShotData;

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		chrome.storage.local.set({installDate:new Date().toString()});
		
		chrome.storage.managed.get(function(items) {
			var doNotOpenWebsite;
			if (chrome.runtime.lastError) {
				console.error("managed error: " + chrome.runtime.lastError.message);
			} else {
				console.log("items", items);
				if (items.DoNotOpenWebsiteOnInstall) {
					doNotOpenWebsite = true;
				}
			}
		});
		
		
	} else if (details.reason == "update") {
		// LEGACY CODE
		// moved all localStorage variables to StorageAPI because we could share the variables in incognito mode
		if (localStorage.installDate) {
			console.log("transfer settings to local");
			chrome.windows.getCurrent(function(thisWindow) {
				if (!thisWindow.incognito) {
					chrome.storage.local.set(
							{
								installDate:localStorage.installDate,
								donationClicked:localStorage.donationClicked == "true",
								removeHeaderFooter:localStorage.removeHeaderFooter == "true",
								removeDonationLink:localStorage.removeDonationLink == "true",
								fontSize:localStorage.fontSize
							}, function() {
						if (chrome.runtime.lastError) {
							console.error(chrome.runtime.lastError.message);
						} else {
							localStorage.removeItem("installDate");
							localStorage.removeItem("installVersion");
							localStorage.removeItem("donationClicked");
							localStorage.removeItem("removeHeaderFooter");
							localStorage.removeItem("removeDonationLink");
							localStorage.removeItem("fontSize");
						}
					});
				}
			});
		}
	}	
});

chrome.commands.onCommand.addListener(function(command) {
	if (command == "grab_selected_area") {
		grabSelectedArea().catch(function() {
			alert(errorResponse);
		});
	} else if (command == "grab_visible_page") {
		grabVisiblePart().catch(function(errorResponse) {
			alert(errorResponse);
		});
	} else if (command == "grab_entire_page") {
		grabEntirePage().catch(function(errorResponse) {
			alert(errorResponse);
		});
	}
});

initContextMenu();

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	if (info.menuItemId == "grabSelectedArea") {
		grabSelectedArea().catch(function() {
			alert(errorResponse);
		});
	} else if (info.menuItemId == "grabVisiblePart") {
		grabVisiblePart().catch(function() {
			alert(errorResponse);
		});
	} else if (info.menuItemId == "grabEntirePage") {
		grabEntirePage().catch(function() {
			alert(errorResponse);
		});
	}
});

if (chrome.runtime.setUninstallURL) {
//	chrome.runtime.setUninstallURL("");
}