var Utils = {
  _sitesSet : new Array(),
  // inject a set of scripts into given tab
  executeScriptFromFile : function(tabId,array_js) {
    if (array_js.length != 0){
      console.log("executeScriptFromFile: adding "+array_js[0]);
      chrome.tabs.executeScript(tabId, { file: array_js[0] }, 
        function() {
          if (chrome.runtime.lastError) {
            console.error("executeScriptFromFile: "+chrome.runtime.lastError.message);
          }
          else {
            Utils.executeScriptFromFile(tabId,array_js.slice(1));  
          }
        }
      );
    }
  },
  executeCssFromFile : function(tabId,array_css) {
    if (array_css.length != 0){
      console.log("executeScriptFromFile: adding "+array_css[0]);
      chrome.tabs.insertCSS(tabId, { file: array_css[0] }, 
        function() {
          if (chrome.runtime.lastError) {
            console.error("executeCssFromFile: "+chrome.runtime.lastError.message);
          }
          else {
            Utils.executeCssFromFile(tabId,array_css.slice(1));  
          }
        }
      );
    }
  },
  executeScriptFromCodeString : function(tabId,codeStringSet) {
    if (codeStringSet.length != 0){
      console.log("executeScriptFromCodeString: adding "+codeStringSet[0]);
      chrome.tabs.executeScript(tabId, { code: codeStringSet[0] }, 
        function() {
          if (chrome.runtime.lastError) {
            console.error("executeScriptFromCodeString: "+chrome.runtime.lastError.message);
          }
          else {
            Utils.executeScriptFromCodeString(tabId,codeStringSet.slice(1));  
          }
        }
      );
    }
  },
  // links a url to a set of scripts to be injected
  registerScriptsSet: function(exp,script_array){
    var regexp = this._urlToRegexp(exp);
    console.log("registerScriptsSet: registering "+regexp);

    this._sitesSet.push({regexp:regexp,script_array :script_array});
  },
  // clears alls scripts
  clearScriptsSet: function(){
    this._sitesSet = [];
  },
  // returns the array of scripts tied to a given site url
  getScriptsToInject:function(url){
    var result = null;
    for(var i=0;i<this._sitesSet.length;i++){
      if (this._sitesSet[i].regexp.exec(url)){
        result = this._sitesSet[i].script_array;
        break;
      }
    }
    return result;
  },
  // translates a "manifest.json" pseudo expr into a true regexp.
  _urlToRegexp : function(url){
    url = url.replace(/\//,"\/");
    url = url.replace(/:/,"\\:");
    url = url.replace(/\?/,"\\?");
    url = url.replace(/\./g,"\\.");
    url = url.replace(/\*/g,"\.*");


    var regexp = new RegExp(url);
    console.log("Regexp=  "+regexp);
    return regexp;
  }
};