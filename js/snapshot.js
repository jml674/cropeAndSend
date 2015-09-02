var screenShotTab;
var screenShotData;
var jcrop_api;


function overlayOnSelect(c) {
  //console.log("onseelectt: " + c.w);
  if (c.w == 0 && c.h == 0) {
    //close();
    overlayOnChange(c);
  } else {
    console.log('onselect non empty c.w='+c.w+' c.h='+c.h);

    $("#SS_ClickAndDragText").hide();
    var canvas = document.getElementById('SS_Canvas');
    canvas.width = c.w;
    canvas.height = c.h;
    var context = canvas.getContext('2d');
    var overlayImage = document.getElementById("SS_OverlayImage");
    // Crop and resize the image: sx, sy, sw, sh, dx, dy, dw, dh.
    context.drawImage(overlayImage, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
    screenShotData = canvas.toDataURL(); // default is png
    $("#SS_Canvas").show();
    //jcrop_api.release();
    jcrop_api.destroy();
    $("#SS_OverlayImage").hide();
    // restore scrollbar
    $("body").removeClass("bodyNoScroll");

  }
}

function overlayOnChange(c) {
  //console.log('onchange');
  $("#SS_ClickAndDragText").show();
  $("#SS_Dialog").dialog("destroy");
}

function createCropeObjects(){
  var $div1 = $("<div>",{id:"SS_ClickAndDragText",style:"display:none;border-radius:1px;padding:2px;z-index:5005;background:#FFFFCC;border: 1px solid black;position:absolute;left:-500px;top:-500px",msg:"clickAndDrag"});

  $("body").append($div1);
  var $div2 = $("<div>",{id:"SS_Overlay",style:"top:0px;position:absolute;z-index:5000;overflow:hidden;display:none",msg:"clickAndDrag"});
  $("body").append($div2);
  var $img = $("<img>",{id:"SS_OverlayImage"});
  $div2.append($img);
  var $dialog = $("<div>",{id:"SS_Dialog",style:"display:none;font-size:12px;text-align:center;padding:20px 0;width:400px;vertical-align:middle;"});
  $("body").append($dialog);
  var $divcanvas = $("<div>");
  $("body").append($divcanvas);
  var $canvas=$("<canvas>",{id:'SS_Canvas',width:'350',height:'250',style:'display:none;border:2px solid red;'});
  $divcanvas.append($canvas);
}

function init(clickAndDragLabel) {
  if (!window.CAS) {

    createCropeObjects();
  }

  setTimeout(function() {
    $("#SS_ClickAndDragText").text(clickAndDragLabel);
    $("#SS_Overlay").css("top",window.scrollY+"px");
    $("#SS_Overlay").css("left",window.scrollX+"px");

    if (!window.CAS){
      console.log("init1 mouse "+$("#SS_Overlay").length);
      $("#SS_Overlay").mousemove(function(e) {
        $("#SS_ClickAndDragText").css({
          top: (e.pageY + 15) + "px",
          left: (e.pageX + 15) + "px"
        });
      });
    }
    if (screenShotData == null) screenShotData = "NULL";
    console.log("init2 src "+screenShotData.substr(0,20)+"...");
    $('#SS_OverlayImage').attr("src", screenShotData);
    console.log("init3 show overlay"+$("#SS_Overlay").length);
    //$('#SS_OverlayImage').on("load", function() {
    $("#SS_Overlay").show();
    $("#SS_OverlayImage").show();


    console.log("init4 crop overlayimage "+$("#SS_OverlayImage").length)
    //if (!window.CAS) {
      $('#SS_OverlayImage').Jcrop({ 
          //setSelect: [ -100, -100, -100, -100 ],
          //boxWidth: 1000,
          //boxHeight: 1000,
          onSelect: overlayOnSelect,
          onChange: overlayOnChange,
          trueSize: [$("#SS_OverlayImage").width(), $("#SS_OverlayImage").height()]
      },function(){
        jcrop_api=this;
        console.log("setting jcrop_api to "+jcrop_api);
      });
    window.CAS=true;

  }, 1);
  //});
}

$(document).ready(function() {
  
  // hide scrollbar, so usrs can't easily scroll
  $("body").addClass("bodyNoScroll");

    chrome.runtime.sendMessage({action:"tabReady"},function(response){
      console.log("ready doc receiving src "+response.screenShotData);
      screenShotTab = response.screenShotTab;
      screenShotData = response.screenShotData;
      //$("body").css("background-image", "url('" + screenShotData + "')");
      init(response.clickAndDragLabel); 
    });
  //var saved_body_style = $("body").style();

  /* chrome.runtime.getBackgroundPage(function(bg) {
    screenShotTab = bg.screenShotTab;
    screenShotData = bg.screenShotData;
    $("body").css("background-image", "url('" + screenShotData + "')");
    init();
    setTimeout(function() {
        //init();
    }, 1);
  });
*/
});