//var bg = chrome.extension.getBackgroundPage();

var screenShotTab;

var DEBUG_PICT_DOWN = false;
var DEBUG_IMM_DOWN = false;

var globalImageURL;
var canvastemp;
var context;
var contexttemp;
var clickedTool;
var canvasLeft;
var ajaxObj;
var aborted = false;
var hoveringOverFontSize = false;

var immioOrigins = "http://imm.io/*";
var immioGranted = false;
var chemicalOrigins = "http://files.chemicalservers.com/*";
var chemicalGranted = false;

chrome.permissions.contains({origins: [immioOrigins]}, function(result) {
	if (result) {
		immioGranted = true;
	}
});
chrome.permissions.contains({origins: [chemicalOrigins]}, function(result) {
	if (result) {
		chemicalGranted = true;
	}
});

if (!window.BlobBuilder && window.WebKitBlobBuilder) {
	window.BlobBuilder = window.WebKitBlobBuilder;
}

function writeText(str, context, x, y) {
	if (context.fillText) {
		context.fillText(str, x, y);
	} else if (context.strokeText) {
		context.strokeText(str, x, y);
	}
}

function watermarkImage() {
	if (typeof canvas != "undefined" && canvas.width > 200 && screenShotTab) {
		setShadow(false);
		context.font = 'normal 10px sans-serif';
		c.strokeStyle = c.fillStyle = "black";
		writeText("Explain and Send Screenshots", context, 10, 15);
		writeText(screenShotTab.url, context, 10, canvas.height-15);
		c.strokeStyle = c.fillStyle = drawingColor;
	}
}

function setShadow(flag, offset) {
	if (flag) {
		if (!offset) {
			offset = 5;
		}
		context.shadowOffsetX = contexttemp.shadowOffsetX = offset;
		context.shadowOffsetY = contexttemp.shadowOffsetY = offset;
		context.shadowBlur = contexttemp.shadowBlur = 4;
		context.shadowColor = contexttemp.shadowColor = "gray";
	} else {
		context.shadowOffsetX = contexttemp.shadowOffsetX = 0;
		context.shadowOffsetY = contexttemp.shadowOffsetY = 0;
		context.shadowBlur = contexttemp.shadowBlur = 0;
		context.shadowColor = contexttemp.shadowColor = "none";
	}
}

function uploadWithImmio(website, callback) {
	ajaxObj = $.ajax({
		url: "http://imm.io/store/",
		type: "POST",
		contentType: "multipart/form-data",
		timeout: 45000,
		data: 'name=screenshot&image='+encodeURIComponent(canvas.toDataURL()),
		beforeSend: function(request) {
			request.setRequestHeader('Content-type','application/x-www-form-urlencoded');
		},
		complete: function(response, textStatus) {
			var status = getStatus(response, textStatus);
			if (status == 200) {
				var responseObj = JSON.parse(response.responseText);
				if (responseObj.success) {
					console.log("responseObj: ", responseObj);
					callback({imageURL:responseObj.payload.uri}); //, deleteURL:responseObj.payload.link + "/delete"
				} else {
					callback({textStatus:textStatus, status:"error with upload"});
				}
			} else {
				callback({textStatus:textStatus, status:status});
			}
			
			/*
			var status = getStatus(request, textStatus);
			if (status == 200) {
				var indirectURL = request.responseText;
				$.ajax({
					url: indirectURL,
					type: "GET",
					timeout: 45000,
					complete: function(request, textStatus) {
						status = getStatus(request, textStatus);
						if (status == 200) {
							var body = findTag(request.responseText, "body");
							// Find direct link
							var imageURL = $(body).find("img").attr("src");
							// else find indirect link
							if (!imageURL) {
								imageURL = $(body).find("input").attr("value");
							}
							if (imageURL) {
								if (imageURL.indexOf("http") == -1) {
									imageURL = "http://imm.io" + imageURL;
								}
								callback({imageURL:imageURL, deleteURL:indirectURL + "/delete"});
							} else {
								// send them to imm.io's share page because couldn't find any link
								location.href = indirectURL;
							}
							return;
						} else {
							//callback({error:"Error: " + status + " - " + textStatus});
							location.href = request.responseText;
						}
					}
				});
			} else if (status == 413) {
				var host = parseURL(this.url).host;
				callback({textStatus:textStatus, error: "Sorry, the screenshot was too large for for " + host + " - try using a smaller screenshot or a different upload site"});
			} else {
				callback({textStatus:textStatus, status:status});
			}
			*/
		}
	});
}

function uploadImage(website, callback) {
	
	//callback({textStatus:"eeeerrror", error:"test error"});
	//return;
	
	try {
		/*
		if (true) {
			ajaxObj = $.ajax({
				url: "http://www.imgplace.com/upload-pc.php",
				type: "POST",
				timeout: 45000,
				//data: "thefile0=" + encodeURIComponent(canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "")),
				data: canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, ""),
				complete: function(request, textStatus) {
					var status = getStatus(request, textStatus);
					alert(status)
					alert(request.responseText)
					alert(request.responseXML)
					alert(request.responseText.substring(2000))
					alert(request.responseText.substring(3000))
					alert(request.getAllResponseHeaders());
					alert(request.getResponseHeader("location"));
				}
			});
		}
		*/
		
		/*
		sendMultipart("http://post.imageshack.us/", {name:"fileupload", filename: "test.png", contentType:"image/png"}, {"uploadtype": "on", "refer":"http://imageshack.us/"}, function(params) {
			var request = params.request;
			var textStatus = params.textStatus;
			var status = getStatus(request, textStatus);
			alert(status);
			alert(request.responseText);
			console.log(request);
		});
		return;
		*/

		if (website == "chemical") {
			ajaxObj = $.ajax({
				url: "http://files.chemicalservers.com/api.php",
				type: "POST",
				timeout: 45000,
				data: "file=" + encodeURIComponent(canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "")),
				complete: function(request, textStatus) {
					var status = getStatus(request, textStatus);
					if (status == 200) {
						var code = request.responseText;
						$.ajax({
							url: "http://files.chemicalservers.com/download.php?code=" + code + "&fn=screenshot.png",
							type: "GET",
							timeout: 45000,
							complete: function(request, textStatus) {
								status = getStatus(request, textStatus);
								if (status == 200) {
									try {
										var idx = request.responseText.indexOf("location=");
										var str = request.responseText.substring(idx, idx+500);
										var relativeUrl = str.split("'")[1];
										var imageURL = "http://files.chemicalservers.com/" + relativeUrl;
										callback({imageURL: imageURL});
									} catch (e) {
										logError("Error parsing download page: " + e);
										location.href = this.url;
									}
									return;
								} else {
									callback({textStatus:textStatus, status:status});
								}
							}
						});
						//callback({imageURL: "http://files.chemicalservers.com/download.php?code=" + code + "&fn=screenshot.png"});
					} else {
						callback({textStatus:textStatus, status:status});
					}
				}
			});
		} else if (website == "immio") {
			// imm.io
			uploadWithImmio(website, callback);
		} else if (website == "imgur") {
			ajaxObj = $.ajax({
				url: "https://api.imgur.com/3/upload.json",
				type: "POST",
				timeout: 45000,
				data: "image=" + encodeURIComponent(canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "")),
				beforeSend : function(xhr) {
					xhr.setRequestHeader("Authorization", "Client-ID " + "c26e99413670dbc");
				},
				complete: function(request, textStatus) {
					var status = getStatus(request, textStatus);
					if (status == 200) {
						try {
							var o = JSON.parse(request.responseText);
							console.log("response: ", o);
							if (o.success) {
								callback({imageURL:o.data.link, deleteURL:"http://imgur.com/delete/" + o.data.deletehash});
							} else {
								logError("error imgur4: " + o.data.error);
								callback({textStatus:textStatus, error:"Error: " + e + " Please try again or try later"});
							}
						} catch (e) {
							logError("error imgur: " + e);
							callback({textStatus:textStatus, error:"Error: " + e + " Please try again or try later"});
						}
					} else {
						try {
							var o = JSON.parse(request.responseText);
							logError("error imgur2: " + status + " - " + textStatus + " " + o.error.message);
							callback({textStatus:textStatus, error:o.error.message});
						} catch (e) {
							logError("error imgur3: " + status + " - " + textStatus);
							callback({textStatus:textStatus, status:status});
						}
					}
				}
			});
		} else if (website == "minus") {
			/*
			Minus.createGallery(function(gallery) {
				
				var bin = atob(canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "")); //file.data
				var arr = new Uint8Array(bin.length);
				for(var i = 0, l = bin.length; i < l; i++) {
					arr[i] = bin.charCodeAt(i);
				}
				//append(arr.buffer)
				alert("after bin: " + arr.buffer)
				
				Minus.uploadItem(gallery.editor_id, "test.png", "image/png", arr.buffer,
					function(file) {
						alert('file: ' + file.id)
						callback({imageURL:file.id});
					}
				);
			});
			return;
			*/
			
			var minusGallery = {};

			
			  function newGallery(cb){
				minusGallery.obsolete = true;
				var xhr = new XMLHttpRequest();
				xhr.open("GET", "http://min.us/api/CreateGallery", true);
				xhr.onload = function(){
				  var info = JSON.parse(xhr.responseText);
				  info.time = +new Date;
				  minusGallery = info;
				  console.log(info);
				  cb();
				}
				xhr.onerror = function(e){
				  //callback('error: min.us could not create gallery')
				  alert("error: " + e);
				}
				xhr.send();
			  }
			  
			  function upload(){
				minusGallery.time = +new Date;
				sendMultipart("http://min.us/api/UploadItem?editor_id="+minusGallery.editor_id+"&filename=test.png", {name:"file", filename: "test.png", contentType:"image/png"}, {}, function(params) {
					var request = params.request;
					var textStatus = params.textStatus;
					var status = getStatus(request, textStatus);
					if (status == 200) {
						var uploadInfo = JSON.parse(request.responseText);
						ajaxObj = $.ajax({
							url: 'http://min.us/api/GetItems/m'+minusGallery.reader_id,
							timeout: 5000,
							complete: function(request, textStatus) {
								var status = getStatus(request, textStatus);
								if (status == 200) {
									var j = JSON.parse(request.responseText).ITEMS_GALLERY
									var filename = "";
									for(var i = 0; i < j.length; i++){
									  if(j[i].indexOf(uploadInfo.id) != -1){
										filename = j[i];
										i++; //increment by one as counter starts at one
										break;
									  }
									}
									// minus link: 'http://min.us/m'+minusGallery.reader_id+'#'+i
									callback({imageURL:filename});
								} else {
									logError("error minus: " + status + " - " + textStatus);
									callback({textStatus:textStatus, status:status});
								}
							}
						});
					} else {
						logError("error minus2: " + status + " - " + textStatus);
						callback({textStatus:textStatus, status:status});
					}
				});
			  }
			  
			  if(minusGallery.time && minusGallery.time > (+new Date) - (1000 * 60 * 10)){
				//keep uploading to the same gallery until 10 minutes of inactivity
				upload();
			  }else if(minusGallery.obsolete){
				//when somethings outdated theres a potential race condition
				(function(){
				  if(minusGallery.obsolete){
					setTimeout(arguments.callee, 100);
				  }else{
					upload()
				  }
				})()
			  }else{
				newGallery(upload)
			  }
		}
	} catch (e) {
		logError("error uploadimage: " + e);
		callback({error:"Error: " + e + ". Please try later or try another upload site!"});
	}
}

function uploadImageWrapper(website, callback) {
	uploadImage(website, function(params) {
		if (params.textStatus || params.error) {
			if (params.error) {
				alert(params.error)
			} else if (params.textStatus = "timeout") {
				alert("Host might be down, please try another one...");
			} else {
				alert("Error " + params.textStatus + " with host, please try another one...");
			}							
			$("#uploadWebsitesWrapper").show();
			$("#uploadProcessing").hide();
			callback({error:params.error});
		} else {
			$("#uploadProcessing").hide();
			$("#uploadProcessingDone").slideDown();
			
			$("#editedImage").attr("src", params.imageURL);
			$("#imageURL").val(params.imageURL);
			if (params.deleteURL) {
				$("#deleteURL").val(params.deleteURL);
				$("#deleteURLWrapper").show();
			}
			globalImageURL = params.imageURL;
			$("#shareLinks").show();
			$("#imageURL").click();			
			callback({imageURL : params.imageURL});
		}
	});
}

function postGrantedUpload(website) {
	$("#uploadProcessing").show();
	$("#uploadProcessingDone").hide();
	
	$("#uploadWebsitesWrapper").slideUp("fast", function() {			
		sendGA("uploadWebsite", website);			
		
		uploadImageWrapper(website, function(params) {
			if (!params.error) {
				$("#gmailIssue").slideUp();
			}
		});
		
		return false;
	});
}

$(document).ready(function() {
	
	// Must load storage items first (because they are async)
	loadStorage().then(function() {
		if (storage.alwaysUpload) {
			$("#gmailIssue").hide();
			$(".makeDefault").hide();
		} else {
			$("#removeDefault").hide();
		}
		
		function postImage(callback) {
			aborted = false;
			$("#donate").hide();
			$("#processing").dialog({
				minHeight: 50,
				width: 600,
				position: [null, 120],
				modal: true,
				close: function(event, ui) {
					if (ajaxObj) {
						aborted = true;
						ajaxObj.abort();							
					}
				}
			});
			setTimeout(function() {
				$("#hurried").slideDown();
			}, 5000);
			$("#previewImage").attr("src", canvas.toDataURL());
			setTimeout(function() {
				
				if (storage.alwaysUpload) {
					uploadImageWrapper(storage.alwaysUpload, function(params) {
						if (params.error) {
							if (confirm("Would you like to remove " + storage.alwaysUpload + " as your default")) {
								//localStorage.removeItem("alwaysUpload");
								chrome.storage.local.remove("alwaysUpload");
							}
						} else {
							$("#createLinkWrapper").hide();
							$("#shareWrapper").show();
							$("#uploadWebsitesWrapper").hide();
						}
						callback(params);
					});
				} else {
					var myThreadedEncoder = new JPEGEncoderThreaded("js/jpeg_encoder_threaded_worker.js");
					var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
					var myPrepardedImage = myThreadedEncoder.encode(imageData, 100, function(imageSrc) {
						//$("#editedImage").attr("src", imageSrc);
						if (aborted) {
							return;
						}
						callback({imageURL : imageSrc});
					}, false);
				}
			}, 500)
		}

		function initTools() {
			if (lastToolUsed == "select") {
				c.tool.down();
			}
		}
		
		function initFonts() {
			var fontSize;
			var fontSizePref = storage.fontSize;
			if (!fontSizePref) {
				fontSizePref = "normal";
			}
			$(".fontSize").removeClass("selected");
			if (fontSizePref.match(/small/i)) {
				$("#fontSmall").addClass("selected");
				fontSize = 12;
				lineHeight = 16;
			} else if (fontSizePref.match(/normal/i)) {
				$("#fontNormal").addClass("selected");
				fontSize = 18;
				lineHeight = 22;
			} else {
				$("#fontLarge").addClass("selected");
				fontSize = 30;
				lineHeight = 34;
			}
			context.font = 'bold ' + fontSize + "px sans-serif";
			$("#text")
				.css("font", context.font)
				.css("line-height", lineHeight + "px")
			;
		}

		
		chrome.runtime.getBackgroundPage(function(bg) {
			
			// save this now because bg might disappear after going idle because it's an event page
			screenShotTab = bg.screenShotTab;
			console.log("in edit: " + bg.screenShotData.substring(0, 50));
			
			var image = new Image();
			image.src = bg.screenShotData;
			image.onload = function() {
				
				console.log("width of image: " + image.width);
				
				canvas = document.getElementById('canvas');
				canvastemp = document.getElementById('canvastemp');
				var rightMargin = 0;
				if (localStorage.grabMethod == "entirePage") {
					rightMargin = SCROLLBAR_WIDTH;
				}
				canvas.width = canvastemp.width = image.width - rightMargin;
				
				console.log("width of image: " + canvas.width);
				
				canvas.height = canvastemp.height = image.height;
				context = canvas.getContext('2d');
				contexttemp = canvastemp.getContext('2d');
				context.drawImage(image, 0, 0);
				canvasLeft = $("canvas").offset().left;
				$("#canvastemp").css("left", canvasLeft );
				// if image is small then lower the top of the image editing box to show a space between header and image
				if (canvas.width < 600) {
					//$("#canvas").before($("<br/><br/>"))
					$("#workspace").css("margin-top", "30px");
				}

				initPaint()

				initFonts();
				setShadow(true);
			}
		});
		
		$("#refresh").click(function() {
			window.location.reload();
		});

		$("#toolbar li img").click(function() {
			setShadow(true);
			clickedTool = $(this);
			if (clickedTool.attr("src").indexOf("select") != -1) {
				setShadow(false);
				c.tool = new tool.select();
				document.getElementById("canvas").className = "line";
			} else if (clickedTool.attr("src").indexOf("crop") != -1) {
				setShadow(false);
				c.tool = new tool.select();
				document.getElementById("canvas").className = "line";
			} else if (clickedTool.attr("src").indexOf("ellipsis") != -1) {
				initTools();
				c.tool = new tool.ellipse();
				document.getElementById("canvas").className = "line";
			} else if (clickedTool.attr("src").indexOf("blur") != -1) {
				setShadow(false);
				initTools();
				c.tool = new tool.eraser();
				document.getElementById("canvas").className = "blur";
			} else if (clickedTool.attr("src").indexOf("rectangle") != -1) {
				initTools();
				c.tool = new tool.rectangle();
				document.getElementById("canvas").className = "line";
			} else if (clickedTool.attr("src").indexOf("drawFreehand") != -1) {
				initTools();
				c.tool = new tool.pencil();
				document.getElementById("canvas").className = "line";
			} else if (clickedTool.attr("src").indexOf("line") != -1) {
				initTools();
				c.tool = new tool.line();
				document.getElementById("canvas").className = "line";
			} else if (clickedTool.attr("src").indexOf("text") != -1) {
				console.log("text clicked");
				$("#editingInstructions").slideUp("fast", function() {
					$("#textOptions").slideDown();
				});
				setShadow(false);
				initTools();
				c.tool = new tool.text();
				document.getElementById("canvas").className = "text";
			} else if (clickedTool.attr("src").indexOf("undo") != -1) {
				undo();
				return;
			} else {
				initTools();
				c.tool = new tool.arrow();
				document.getElementById("canvas").className = "line";
			}
			
			if (!clickedTool.attr("src").match("text")) {
				$("#textOptions").fadeOut();
			}
			
			$("#toolbar li img").each(function(i) {
				if (clickedTool.attr("src") == $(this).attr("src")) {
					var newSrc = $(this).attr("src").replace("Off", "On");
					$(this).attr("src", newSrc);
				} else {
					var newSrc = $(this).attr("src").replace("On", "Off");
					$(this).attr("src", newSrc);
				}
			});
		});

		$("#text").blur(function() {
			if (!hoveringOverFontSize) {
				console.log("text blur: " + hoveringOverFontSize)
				//context.font = 'bold 18px sans-serif';
				context.textBaseline = 'top';
				c.fillStyle = c.strokeStyle;

				var x = $(this).position().left - canvasLeft + 1;
				var y = $(this).position().top;
				
				var lines = $(this).val().split("\n");
				for (var a=0; a<lines.length; a++) {
					writeText(lines[a], context, x, y);
					y += parseInt($(this).css("line-height").replace("px", ""));
				}

				$(this).hide();
				document.getElementById("workspace").className = "text";
			}
		});

		function showOptions(response) {
			if (response == null || response.error) {
				//$(".displayForSharing").hide();
				$("#editedImage").attr("src", canvas.toDataURL());
			}
			if (response == null) {
				//$("#error").css("color", "brown").html("In privacy mode sharing links are disabled!<br>When pasting you might have to use: Edit > Paste Special > As Bitmap").show();
				$("#error").css("color", "brown").html("Sharing links no longer supported for now, sorry!<br>When pasting you might have to use: Edit > Paste Special > As Bitmap").show();
			} else if (response.error) {
				$("#error").html(response.error + ", sharing links will be disabled, please try again later!").show();
			} else {
				//$("#error").css("color", "brown").html("Sharing links no longer supported for now, sorry!<br>When pasting you might have to use: Edit > Paste Special > As Bitmap").show();
				//$(".displayForSharing").hide();
				var image = document.getElementById("editedImage");
				image.onload = function() {
					$("#bottomFooterMsg").css("margin-top", $("#editedImage").height() - 44);
				}
				$("#editedImage").attr("src", response.imageURL);					
				//$("#imageURL").val(response.imageURL);
				//globalImageURL = response.imageURL;
			}
			$("#toolbar").hide();
			$("#editor").hide();
			$(".options").show();
			$("#shareScreenshot").show();
			if (isEligibleForReducedDonation()) {
				$("#reducedDonationMessage").slideDown("slow");
			}
			var width = canvas.width;
			if (width < 600) {
				//$("#editedImageWrapper").css("width", width + 200);
			}
			$("#processing").dialog("destroy");
		}

		$("#done").click(function() {
			initTools();
			if (!storage.removeHeaderFooter) {
				watermarkImage();
			}
			if (storage.doNotHostOnline) {
				showOptions(null, true);
			} else {
				// imm not working in chrome 6 hack here
				//	showOptions(null);
				postImage(function(response) {
					showOptions(response);
				});
			}
		});


		$("#colorPicker").click(function() {				
			$("#colorGrid").toggle();
			$("#colorGrid").css("left", $("#colorPicker").offset().left + "px");
			sendGA("colorPicker", "click");
		});
		$(".color").click(function() {
			var color = $(this).css("background-color");
			setDrawingColor(color);
			$("#colorPicker").css("background-color", color);
			$("#text").css("color", color);
			$("#colorGrid").hide();
		});

		$("#shareLinks a").click(function(e) {
			if (!globalImageURL) {
				alert("You must upload it first by clicking the upload link above!");
				return;
			}
			if ($(this).attr("id") == "fb") {
				facebookShare(globalImageURL, "Captured by 'Explain and Send Screenshots'");
			}
			if ($(this).attr("id") == "twitter") {
				tweet(globalImageURL, "Captured by 'Explain and Send Screenshots'");
			}
			if ($(this).attr("id") == "myspace") {
				location.href = "http://www.myspace.com/Modules/PostTo/Pages/?u=" + encodeURIComponent(globalImageURL);
			}
			if ($(this).attr("id") == "gmail") {
				var url = "https://mail.google.com/mail/?view=cm&tf=0&fs=1&su=screenshot&body=" + encodeURIComponent(globalImageURL + "\n\nCaptured by Explain and Send Screenshots - http://bit.ly/oS7lxz");
				window.open(url, 'sharer', 'toolbar=0,status=0,resizable=1,width=626,height=536');
				//location.href = "https://mail.google.com/mail/?view=cm&tf=0&fs=1&body=" + encodeURIComponent(globalImageURL);
			}
			if ($(this).attr("id") == "hotmail") {
				location.href = "http://www.hotmail.msn.com/secure/start?action=compose&body=" + encodeURIComponent(globalImageURL);
			}
			$("#copyToClipboard").click( function() {
				$("#imageURL").select().focus();
				document.execCommand('Copy');
				$("#copyToClipboard").html(chrome.i18n.getMessage("readyForPasting"));
			});

		});

		$("#pixlr").click(function() {
			if (!storage.pixlrWarningDisplayed) {
				if (confirm("This will upload your image to imgur.com to enable editing in pixlr. Do you wish to continue?")) {
					setStorageItem("pixlrWarningDisplayed", true);
				} else {
					return false;
				}
			}
			
			showLoading();
			uploadImage("imgur", function(params) {
				hideLoading();
				if (params.error) {
					$("#error").html(params.error + ", try cropping the image smaller or try again later!").show();
				} else if (!params.imageURL) {
					$("#error").html("Could not upload image, try cropping the image smaller or try again later!").show();
				} else {
					location.href = "http://apps.pixlr.com/editor/?image=" + params.imageURL + "&title=Captured by 'Explain and Send Screenshots'";
				}
			});
		});
		
		$("#contribute").click(function() {
			chrome.tabs.create({url: 'donate.html?fromEditor'});
		});
		
		$(".makeDefault").click(function() {
			if (confirm("Note that everytime you take a screenshot and click done it will now be uploaded. You can always remove this by clicking Remove Default at the bottom")) {
				setStorageItem("alwaysUpload", $(this).attr("site"));
				$(".makeDefault").fadeOut();
				
				$(".uploadWebsite[site='" + $(this).attr("site") + "']").click();
			}
		});
		
		$("#removeDefault").click(function() {
			//localStorage.removeItem("alwaysUpload");
			chrome.storage.local.remove("alwaysUpload");
			$(this).fadeOut();
		});

		function sendMultipart(url, fileParams, dataParams, callback) {
			var BOUNDARY = "---------------------------1966284435497298061834782736";
			var rn = "\r\n";
			var data = new Blob()
			var append = function(dataParam) {
				data.append(dataParam)
			}
			/*
			var data = "", append = function(dataParam){
				data += dataParam;
			}
			*/
			append("--" + BOUNDARY);
			for (var i in dataParams) {
				append(rn + "Content-Disposition: form-data; name=\"" + i + "\"");
				append(rn + rn + dataParams[i] + rn + "--" + BOUNDARY);
			}
			append(rn + "Content-Disposition: form-data; name=\"" + fileParams.name + "\"");
			append("; filename=\"" + fileParams.filename + "\"" + rn + "Content-type: " + fileParams.contentType);
			append(rn + rn);
			var bin = atob(canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "")); //file.data
			var arr = new Uint8Array(bin.length);
			for(var i = 0, l = bin.length; i < l; i++) {
				arr[i] = bin.charCodeAt(i);
			}
			append(arr.buffer)
			//append(bin)

			append(rn + "--" + BOUNDARY);
			append("--");
				
			ajaxObj = $.ajax({
				url: url,
				type: "POST",
				contentType: "multipart/form-data",
				timeout: 45000,
				processData: false, // Useful for not getting error when using blob in data
				data: data.getBlob(), // refer to processData flag just above
				beforeSend: function(request) {
					request.setRequestHeader("Content-type", "multipart/form-data; boundary=" + BOUNDARY);
				},
				complete: function(request, textStatus) {
					callback({request:request, textStatus:textStatus});
				}
			});
		};
		
		$(".uploadWebsite").click(function() {
			var $uploadWebsite = $(this);
			var website = $uploadWebsite.attr("site");
			var originsToGrant;
			
			if (website == "immio" && !immioGranted) {
				originsToGrant = immioOrigins;
			} else if (website == "chemical" && !chemicalGranted) {
				originsToGrant = chemicalOrigins;
			}

			if (originsToGrant) {
				chrome.permissions.request({origins: [originsToGrant]}, function(granted) {
					// The callback argument will be true if the user granted the permissions.
					if (granted) {
						postGrantedUpload(website);
					} else {
						// do nothing
				  	}
				});
			} else {
				postGrantedUpload(website);
			}
			
			return false;
		});
		
		$("#uploadWebsites li").click(function() {
			$(this).find(".uploadWebsite").click();
		});
		
		$("#imageURL, #deleteURL").click(function() {
			$(this).select();
		});
		
		if (storage.donationClicked) {
			$("#donate").hide();
		}
		if (storage.removeHeaderFooter) {
			$("#topHeaderMsg, #bottomFooterMsg").hide();
			$("#editedImage").css("float", "none");
		}
		
		$("#topHeaderMsg, #bottomFooterMsg").click(function() {
			if (donationClicked("removeHeaderFooter", storage)) {
				location.href = "options.html";
			}
		});
		
		$("#donate").click(function() {
			location.href = "donate.html?fromOptions=true";
		});
		
		$(".fontSize").click(function() {
			if (donationClicked("fontSize", storage)) {
				console.log("fontsize");
				setStorageItem("fontSize", $(this).attr("id"));
				initFonts();
			}
		}).mouseenter(function() {
			hoveringOverFontSize = true;
		}).mouseleave(function() {
			hoveringOverFontSize = false;
		});

		$("#createLink, #linkExample").click(function() {
			$("#createLinkWrapper").slideUp();
			$("#shareWrapper").slideDown();
		});
		
		$("#gmailIssueDetails").click(function() {
			$(this).hide();
			$('#alternatives').slideDown();
			setTimeout(function() {
				$("#createLink").click();
			}, 3500);
		});
		
		$("#download").click(function() {
			if (globalImageURL) {
				// use download image instead
				//$(this).attr("href", globalImageURL);
				//$(this).attr("target", "_blank");
				location.href = globalImageURL;
			} else {
				// data url
				saveAs(dataURItoBlob( $("#editedImage").attr("src") ));
			}
		});
		
		$("#saveImageAs").click(function() {
			$(".option").slideUp();
			$("#saveImageAsOption").slideDown();
		});

		$("#copyToClipboard").click(function() {
			$(".option").slideUp();
			$("#copyToClipboardOption").slideDown();
		});

		$("#share").click(function() {
			$(".option").slideUp();
			$("#shareOption").slideDown();
		});
		
		$("body").click(function() {
			
			//saveAs(dataURItoBlob( $("#editedImage").attr("src") ));
			return;

			function onInitFs(fs) {
				
				function errorHandler(e) {
					  var msg = '';

					  switch (e.code) {
					    case FileError.QUOTA_EXCEEDED_ERR:
					      msg = 'QUOTA_EXCEEDED_ERR';
					      break;
					    case FileError.NOT_FOUND_ERR:
					      msg = 'NOT_FOUND_ERR';
					      break;
					    case FileError.SECURITY_ERR:
					      msg = 'SECURITY_ERR';
					      break;
					    case FileError.INVALID_MODIFICATION_ERR:
					      msg = 'INVALID_MODIFICATION_ERR';
					      break;
					    case FileError.INVALID_STATE_ERR:
					      msg = 'INVALID_STATE_ERR';
					      break;
					    default:
					      msg = 'Unknown Error';
					      break;
					  };

					  alert("err: " + msg);
					  logError('Error oninitfs: ' + msg);
					}
				
		        var cvs = document.createElement('canvas');
		        var ctx  = cvs.getContext("2d");
		        
		        var img = document.getElementById("editedImage");
		        
		        cvs.width = img.width;
		        cvs.height = img.height;
		        ctx.drawImage(img, 0, 0);
		        var imd = cvs.toDataURL("image/png");
		        var ui8a = convertDataURIToBinary(imd);
		        
		        //img.src = ui8a;
		        
		        //var bb = new Blob();
		        //bb.append(ui8a.buffer);
		        //alert('a: ' + ui8a);
		        
		        fs.root.getFile('test2.txt', {}, function(fileEntry) {
		        	
		        	function toArray(list) {
		        		  return Array.prototype.slice.call(list || [], 0);
		        		}

		        		function listResults(entries) {
		        		  // Document fragments can improve performance since they're only appended
		        		  // to the DOM once. Only one browser reflow occurs.

		        		  entries.forEach(function(entry, i) {
		        		    var img = entry.isDirectory ? '<img src="folder-icon.gif">' :
		        		                                  '<img src="file-icon.gif">';
		        		    var li = document.createElement('li');
		        		    li.innerHTML = [img, '<span>', entry.name, '</span>'].join('');
		        		    console.log("file: ", entry);
		        		    
		 	               //var objURL = window.webkitURL.createObjectURL(entry);
			               //console.log("objurl", objURL);

			               fs.root.getFile(entry.name, {}, function(fileEntry) {
			            	   console.log("fileentry: ", fileEntry)
			               });
		        		    
		        		  });

		        		}
		        	
		        	var dirReader = fs.root.createReader();
		        	  var entries = [];
		        	  
		        	  alert('afterread')
		        	  
		        	  // Call the reader.readEntries() until no more results are returned.
		        	  var readEntries = function() {
		        	     dirReader.readEntries (function(results) {
		        	    	 alert('reading')
		        	      if (!results.length) {
		        	        listResults(entries.sort());
		        	      } else {
		        	        entries = entries.concat(toArray(results));
		        	        readEntries();
		        	      }
		        	    }, errorHandler);
		        	  };

		        	  readEntries(); // Start reading dirs.
		        	  

		        	console.log("in getfile")
		        		
		            // Get a File object representing the file,
		            // then use FileReader to read its contents.
		            fileEntry.file(function(file) {
		               var reader = new FileReader();

		               console.log("in getfile2")
		               
		               reader.onloadend = function(e) {
		                 var txtArea = document.createElement('textarea');
		                 txtArea.value = this.result;
		                 document.body.appendChild(txtArea);
		               };

		               reader.readAsText(file);
		               
		               var objURL = window.webkitURL.createObjectURL(file);
		               console.log("objurl", objURL);
		               
		               console.log("in getfile3")
		               
		               img.src=objURL;
		               
		            }, errorHandler);
		        	
		        	console.log("in getfileaftger")

		          }, errorHandler );
		        
		        
		        fs.root.getFile("test2.txt", {create: true}, function(fileEntry) {
		        	alert('b')
		        	// Create a FileWriter object for our FileEntry (log.txt).
		            fileEntry.createWriter(function(fileWriter) {

		              fileWriter.onwriteend = function(e) {
		            	  alert('c')
		            	  console.log(window.webkitURL.createObjectURL(fileEntry));
		                console.log('Write completed.');
		              };

		              fileWriter.onerror = function(e) {
		                console.log('Write failed: ' + e.toString());
		              };

		              // Create a new Blob and write it to log.txt.
		              var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

		              fileWriter.write(blob);

		            }, errorHandler);

		        	/*
		            // Create a FileWriter object for our FileEntry (log.txt).
		            fileEntry.createWriter(function(fileWriter) {
		                fileWriter.onwriteend = function(e) {
		                    console.log('Write completed.');
		                    callback && callback("test.jpg");
		                };

		                fileWriter.onerror = function(e) {
		                    console.log('Write failed: ' + e.toString());
		                };

		                fileWriter.write(bb.getBlob("image/png"));
		            });
		            */
		        }, errorHandler);

				function convertDataURIToBinary(dataURI) {
				var BASE64_MARKER = ';base64,';
				var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
				var base64 = dataURI.substring(base64Index);
				var raw = window.atob(base64);
				var rawLength = raw.length;
				var array = new Uint8Array(new ArrayBuffer(rawLength));
				
				for (i = 0; i < rawLength; i++) {
				array[i] = raw.charCodeAt(i);
				}
				return array;
				}

				
				/*
			      fs.root.getFile('image.png', {create: true}, function(fileEntry) {
			        // Create a FileWriter object for our FileEntry (log.txt).
			        fileEntry.createWriter(function(fileWriter) {
			        //WRITING THE BLOB TO FILE
			        fileWriter.write(blob);
			        }, errorHandler);
			      }, errorHandler);
			      */
			      
			    }

			window.webkitRequestFileSystem(window.PERSISTENT, 5*1024*1024, onInitFs, function(e) {
		    	alert("error: " + e)
		    	console.log(e);
		    });
			
		})
		
	});
	
});

function dataURItoBlob(d, k) {
    var j = atob(d.split(",")[1]);
    var c = d.split(",")[0].split(":")[1].split(";")[0];
    var g = new ArrayBuffer(j.length);
    var e = new Uint8Array(g);
    for (var f = 0; f < j.length; f++) {
        e[f] = j.charCodeAt(f)
    }
    var dataView = new DataView(g);
    var h = new Blob([dataView]);
    //h.append(g);
    //return h.getBlob(c)
    return h;
}

var saveAs = saveAs || (function(h) {
    var r = h.document,
        l = function() {
            return h.URL || h.webkitURL || h
        },
        e = h.URL || h.webkitURL || h,
        n = r.createElementNS("http://www.w3.org/1999/xhtml", "a"),
        g = "download" in n,
        j = function(t) {
            var s = r.createEvent("MouseEvents");
            s.initMouseEvent("click", true, false, h, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            return t.dispatchEvent(s)
        },
        o = h.webkitRequestFileSystem,
        p = h.requestFileSystem || o || h.mozRequestFileSystem,
        m = function(s) {
            (h.setImmediate || h.setTimeout)(function() {
                throw s
            }, 0)
        },
        c = "application/octet-stream",
        k = 0,
        b = [],
        i = function() {
            var t = b.length;
            while (t--) {
                var s = b[t];
                if (typeof s === "string") {
                    e.revokeObjectURL(s)
                } else {
                    s.remove()
                }
            }
            b.length = 0
        },
        q = function(t, s, w) {
            s = [].concat(s);
            var v = s.length;
            while (v--) {
                var x = t["on" + s[v]];
                if (typeof x === "function") {
                    try {
                        x.call(t, w || t)
                    } catch (u) {
                        m(u)
                    }
                }
            }
        },
        f = function(t, u) {
            var v = this,
                B = t.type,
                E = false,
                x, w, s = function() {
                    var F = l().createObjectURL(t);
                    console.log("object url: " + F);
                    b.push(F);
                    return F
                },
                A = function() {
                    q(v, "writestart progress write writeend".split(" "))
                },
                D = function() {
                    if (E || !x) {
                        x = s(t)
                    }
                    w.location.href = x;
                    v.readyState = v.DONE;
                    A()
                },
                z = function(F) {
                    return function() {
                        if (v.readyState !== v.DONE) {
                            return F.apply(this, arguments)
                        }
                    }
                },
                y = {
                    create: true,
                    exclusive: false
                },
                C;
            v.readyState = v.INIT;
            if (!u) {
                u = "download.jpg"
            }
            if (g) {
                x = s(t);
                n.href = x;
                n.download = u;
                if (j(n)) {
                    v.readyState = v.DONE;
                    A();
                    return
                }
            }
            if (h.chrome && B && B !== c) {
                C = t.slice || t.webkitSlice;
                t = C.call(t, 0, t.size, c);
                E = true
            }
            if (o && u !== "download") {
                u += ".download"
            }
            if (B === c || o) {
                w = h
            } else {
                w = h.open()
            }
            if (!p) {
                D();
                return
            }
            k += t.size;
            p(h.PERSISTENT, k, z(function(F) { //TEMPORARY
                F.root.getDirectory("saved", y, z(function(G) {
                    var H = function() {
                            G.getFile(u, y, z(function(I) {
                                I.createWriter(z(function(J) {
                                    J.onwriteend = function(K) {
                                        w.location.href = I.toURL();
                                        b.push(I);
                                        v.readyState = v.DONE;
                                        q(v, "writeend", K)
                                    };
                                    J.onerror = function() {
                                        var K = J.error;
                                        if (K.code !== K.ABORT_ERR) {
                                            D()
                                        }
                                    };
                                    "writestart progress write abort".split(" ").forEach(function(K) {
                                        J["on" + K] = v["on" + K]
                                    });
                                    J.write(t);
                                    v.abort = function() {
                                        J.abort();
                                        v.readyState = v.DONE
                                    };
                                    v.readyState = v.WRITING
                                }), D)
                            }), D)
                        };
                    G.getFile(u, {
                        create: false
                    }, z(function(I) {
                        I.remove();
                        H()
                    }), z(function(I) {
                        if (I.code === I.NOT_FOUND_ERR) {
                            H()
                        } else {
                            D()
                        }
                    }))
                }), D)
            }), D)
        },
        d = f.prototype,
        a = function(s, t) {
            return new f(s, t)
        };
    d.abort = function() {
        var s = this;
        s.readyState = s.DONE;
        q(s, "abort")
    };
    d.readyState = d.INIT = 0;
    d.WRITING = 1;
    d.DONE = 2;
    d.error = d.onwritestart = d.onprogress = d.onwrite = d.onabort = d.onerror = d.onwriteend = null;
    h.addEventListener("unload", i, false);
    return a
}(self));