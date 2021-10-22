// ==UserScript==
// @name		 theHandy support for PornHub
// @namespace	http://tampermonkey.net/
// @version	  1.7
// @downloadURL https://raw.githubusercontent.com/NodudeWasTaken/theHandy_Web/master/script.js
// @updateURL https://raw.githubusercontent.com/NodudeWasTaken/theHandy_Web/master/script.js
// @description  Web support for the Handy
// @author	   Nodude
// @match		*://*/*
// @grant		GM_xmlhttpRequest
// @require	  http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @run-at	   document-idle
// ==/UserScript==

//Inspired by notSafeForDev
//Backported changes by jabiim

/*
Update 1.7
Hide some debug information
Update 1.6
Am stupid
Update 1.5
Fixed bugs
Update 1.4
Added custom website support
Update 1.3
Added seek support
Backported changes from jabiim
Update 1.2
Added offset support
Update 1.1
Fixed the script only matching english pornhub
*/

class Hander {
	//Literally just taken from handyfeeling's player
	//But in a class
	//Also GM_xmlhttpRequest for that sweet cross-origin bypass
	constructor() {
		//this.URL_BASE = "http://192.168.137.1:3000/";
		this.URL_BASE = "https://www.handyfeeling.com/";
		this.URL_API_ENDPOINT = "api/v1/";
		this.urlAPI = "";

		this.timeSyncMessage = 0;
		this.timeSyncAggregatedOffset = 0;
		this.timeSyncAvrageOffset = 0;
		this.timeSyncInitialOffset = 0;
	}

	onReady(connectionkey, scriptUrl) {
		//URL_BASE can be local ip, but will browsers allow that?
		this.urlAPI = this.URL_BASE + this.URL_API_ENDPOINT + connectionkey;
		this.updateServerTime(); //Strat time sync with teh server

		//Prepare Handy by telling it where to download the script

		var datas = {
			url: scriptUrl,
			timeout: 30000,
		}

		GM_xmlhttpRequest({
			method: "GET",
			url: this.urlAPI + "/syncPrepare?" + new URLSearchParams(datas).toString(),
			onload: function(response) {
				var result = JSON.parse(response.responseText);
				document.getElementById("state").innerHTML += "<li>Machine reply to syncPrepare: " + JSON.stringify(result) + "</li>";
				console.log(result);
				if (result.success == true) {
					console.log("success");
					document.getElementById("rdycrl").style.backgroundColor = "green";
				}
			}
		});
	}

	setOffset(ms) {
		console.log("offset",ms);

		var datas = {
			offset: ms,
			timeout: 30000,
		}

		GM_xmlhttpRequest({
			method: "GET",
			url: this.urlAPI + "/syncOffset?" + new URLSearchParams(datas).toString(),
			onload: function(response) {
				var result = JSON.parse(response.responseText);
				document.getElementById("state").innerHTML += "<li>Machine reply to syncOffset: " + JSON.stringify(result) + "</li>";
				console.log(result);
			}
		});
	}
	onPlay(videoTime) {
		videoTime = Math.round(videoTime*1000);
		console.log("playing",videoTime);

		var datas = {
			play: true,
			serverTime: this.getServerTime(),
			time: videoTime
		}

		GM_xmlhttpRequest({
			method: "GET",
			url: this.urlAPI + "/syncPlay?" + new URLSearchParams(datas).toString(),
			onload: function(response) {
				var result = JSON.parse(response.responseText);
				document.getElementById("state").innerHTML += "<li>Machine reply to syncPlay: " + JSON.stringify(result) + "</li>";
				console.log(result);
			}
		});
	}
	onPause() {
		console.log("pause");

		var datas = {
			play: false,
		}

		GM_xmlhttpRequest({
			method: "GET",
			url: this.urlAPI + "/syncPlay?" + new URLSearchParams(datas).toString(),
			onload: function(response) {
				var result = JSON.parse(response.responseText);
				document.getElementById("state").innerHTML += "<li>Machine reply to syncPlay: " + JSON.stringify(result) + "</li>";
				console.log(result);
			}
		});
	}

	/*
		sync time with server
	*/

	getServerTime(){
		let serverTimeNow = Date.now() + this.timeSyncAvrageOffset + this.timeSyncInitialOffset;
		return Math.round(serverTimeNow);
	}

	updateServerTime() {
		let sendTime = Date.now();
		let url = this.urlAPI + "/getServerTime";
		// console.log("url:",url);

		GM_xmlhttpRequest({
			method: "GET",
			url: url,
			context: {
				hand: this,
			},
			onload: function(response) {
				var result = JSON.parse(response.responseText);
				var context = response.context || this.context || context;
				var con = context.hand;
				// console.log(result);
				let now = Date.now();
				let receiveTime = now;
				let rtd = receiveTime - sendTime;
				let serverTime = result.serverTime;
				let estimatedServerTimeNow = serverTime + rtd /2;
				let offset = 0;
				if(con.timeSyncMessage == 0){
					con.timeSyncInitialOffset = estimatedServerTimeNow - now;
					console.log("timeSyncInitialOffset:",con.timeSyncInitialOffset);
				}else{
					offset = estimatedServerTimeNow - receiveTime- con.timeSyncInitialOffset;
					con.timeSyncAggregatedOffset += offset;
					con.timeSyncAvrageOffset = con.timeSyncAggregatedOffset / con.timeSyncMessage;
				}
				console.log("Time sync reply nr " + con.timeSyncMessage + " (rtd, this offset, average offset):",rtd,offset,con.timeSyncAvrageOffset);
				con.timeSyncMessage++;
				if(con.timeSyncMessage < 30){
					con.updateServerTime();
				}else{
					//Time in sync
					document.getElementById("state").innerHTML += "<li>Server time in sync. Average offset from client time: " + Math.round(con.timeSyncAvrageOffset) + "ms</li>";
				}
			}
		});
	}
}

(function() {
	'use strict';

	var scriptUrl = null;
	var handyKey = null;
	var videoObj = null;
	var hand = new Hander();

	function getElementByXpath(path) {
		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	}

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function shouldHand() {
		//console.log(scriptUrl, handyKey);
		return scriptUrl != null && handyKey != null;
	}

	function onplay(e) {
		console.log("play - " + event.type);
		if (shouldHand()) {
			hand.onPlay(videoObj.currentTime);
		}

	}
	function onpause(e) {
		console.log("pause - " + event.type);
		if (shouldHand()) {
			hand.onPause();
		}
	}

	function funnyui() {
	  const head = document.createElement("div");
	  
	  const window = document.createElement("div");
	  window.style =  "position: absolute; " + 
					  "top: 0px; " + 
					  "left: 0px; " + 
					  "z-index: 9; " + 
					  "background-color: #f1f1f1; " + 
					  "border: 1px solid #d3d3d3; " + 
					  "color: #000000; " + 
					  "text-align: center; ";
	  window.id = "nodudewashere";
	  head.appendChild(window);
	  
	  const header = document.createElement("div");
	  header.innerHTML = "theHandy support for The Web";
	  header.style =  "padding: 10px; " + 
					  "cursor: move; " + 
					  "z-index: 10; " + 
					  "background-color: #2196F3; " + 
					  "color: #fff";
	  window.appendChild(header);
  
	  /*const elm = document.createElement("p");
	  elm.innerHTML = "Move";
	  window.appendChild(elm);*/
	  
	  var script = document.createElement("script");
	  script.type = "text/javascript";
	  script.innerHTML = `
		  // Make the DIV element draggable:
		  dragElement(document.getElementById("nodudewashere"));

		  function dragElement(elmnt) {
			var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
			if (document.getElementById(elmnt.id + "header")) {
			  // if present, the header is where you move the DIV from:
			  document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
			} else {
			  // otherwise, move the DIV from anywhere inside the DIV:
			  elmnt.onmousedown = dragMouseDown;
			}

			function dragMouseDown(e) {
			  e = e || window.event;
			  //e.preventDefault();
			  // get the mouse cursor position at startup:
			  pos3 = e.clientX;
			  pos4 = e.clientY;
			  document.onmouseup = closeDragElement;
			  // call a function whenever the cursor moves:
			  document.onmousemove = elementDrag;
			}

			function elementDrag(e) {
			  e = e || window.event;
			  e.preventDefault();
			  // calculate the new cursor position:
			  pos1 = pos3 - e.clientX;
			  pos2 = pos4 - e.clientY;
			  pos3 = e.clientX;
			  pos4 = e.clientY;
			  // set the element's new position:
			  elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
			  elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
			}

			function closeDragElement() {
			  // stop moving when mouse button is released:
			  document.onmouseup = null;
			  document.onmousemove = null;
			}
		  }`
	  head.appendChild(script);
	  
	  document.getElementsByTagName("body")[0].appendChild(head);
	  
	  return window;
	}
  
  async function shouldLoad() {
    await GM_xmlhttpRequest({
      //TODO: Should be release relative
			url: "https://raw.githubusercontent.com/NodudeWasTaken/theHandy_Web/master/data.json",
      synchronous: true,
			method: "GET",
			onload: function(response) {
				let result = JSON.parse(response.responseText);
        //console.log(result.length);
        
        for (var i=0; i<result.length; i++) {
          var obj = result[i];
          
          const regex = new RegExp(decodeURIComponent(obj["url_regex"]));
          if (regex.test(window.location.href)) {
            console.log("Found match!");
            console.log(obj["video_xpath"]);
            return init(obj["video_xpath"]);
          }
        }
			}
		});
  }
  
	async function init(xpth) {
	  console.log("loading :)");
	  
		window.addEventListener("beforeunload", function(e){
			if (shouldHand()) {
				hand.onPause();
			}
		}, false);

		//User config
		const selecting = document.createElement("div");
		selecting.style.padding = "20px";

		const bar = document.createElement("div");
		bar.style = "width: 100%; height: 20px; background-color: red; border: solid black 2px; margin: 5px 0;";
		bar.id = "rdycrl";
		selecting.appendChild(bar);
	  
		const finputText = document.createElement("input");
		finputText.type = "file";
		finputText.placeholder = "Select a file";
		finputText.style.marginTop = '4px';
		finputText.style.marginBottom = '4px';
		finputText.style.display = 'block';

		const inputText = document.createElement("input");
		inputText.className = 'input-text';
		inputText.style.width = '200px';
		inputText.style.marginBottom = '4px';
		inputText.type = "text";
		inputText.value = handyKey;
		inputText.placeholder = "Enter connection key";
		inputText.style.display = 'block';

		const uploadButton = document.createElement("input");
		uploadButton.className = 'submit-comment xh-button large red'
		uploadButton.style.marginBottom = '4px';
		uploadButton.type = 'button';
		uploadButton.value = "Upload to handy";
		uploadButton.disabled = true;
		uploadButton.style.display = 'block';

		selecting.appendChild(inputText);

		selecting.appendChild(finputText);

		/*
		const setVidButton = document.createElement("input");
		setVidButton.className = 'submit-comment xh-button large red'
		setVidButton.style.marginBottom = '4px';
		setVidButton.type = 'button';
		setVidButton.value = "Set video element";
		setVidButton.style.display = 'block';

    const choose = document.createElement("select");
    choose.onhover = (event) => {
      //TODO: Highlight
    }
    window.addEventListener("load", function () {
      setTimeout(function(){
        const vids = document.getElementsByTagName("video");
        for (var i=0; i<vids.length; i++) {
          const vid = vids[i];
          const tmp = document.createElement("option");
          tmp.value = i;
          var sources = vid.getElementsByTagName("source");
          if (sources.length > 0) {
            tmp.innerHTML = vid.getElementsByTagName("source")[0].src;
          } else {
            tmp.innerHTML = "unknown";
          }
          choose.appendChild(tmp);
        }
        
        //TODO: Support for builtin
        var bigi = 0;
        var bigd = 0;
        for (var i in vids) {
          const vid = vids[i];
          const vidsize = vid.videoHeight * vid.videoWidth;
          if (vid.videoHeight * vid.videoWidth > bigd) {
            bigi = i;
            bigd = vidsize;
          }
        }
        choose.selectedIndex = bigi;

        setVidButton.onclick = (event) => {
          event.preventDefault();
          console.log(vids[choose.selectedIndex].src);
          videoObj = vids[choose.selectedIndex];

          videoObj.addEventListener("play", onplay);
          videoObj.addEventListener("playing", onplay);
          videoObj.addEventListener("progress", onplay);

          videoObj.addEventListener("seeked", onplay);
          videoObj.addEventListener("seeking", onpause);

          videoObj.addEventListener("pause", onpause);
          videoObj.addEventListener("waiting", onpause);

        }
        }, 500); //TODO: Reliable way to know if loaded
    })
		selecting.appendChild(choose);
    selecting.appendChild(document.createElement("br"));
    */
    
		const inputOffset = document.createElement("label");
		inputOffset.innerHTML += 'Offset:<input class="input-text" style="display: inline-block; width: 200px; margin-left: 4px" type="number" name="Offset" value="0"><span> ms</span></label>';
		selecting.appendChild(inputOffset);

		//selecting.appendChild(setVidButton);
		selecting.appendChild(uploadButton);

		const inputOffsetI = inputOffset.getElementsByTagName("input")[0];
		inputOffsetI.style.marginBottom = '4px';


    
		var stats = document.createElement("a");
		stats.id="state";
		selecting.appendChild(stats);


		var root_ui = funnyui();
		root_ui.appendChild(selecting);


		//Video listening
		while (videoObj==null) {
			videoObj = getElementByXpath(xpth);
			await sleep(100);
		}

		inputOffsetI.addEventListener("keyup", function(event) {
			if (event.keyCode === 13) {
				event.preventDefault();
				hand.setOffset(inputOffsetI.value);
			}
		});

		inputText.addEventListener("blur", function(event) {
			handyKey = inputText.value;
			GM_setValue('handy_key', handyKey);
			if (scriptUrl && handyKey) {
				uploadButton.disabled = false;
			} else {
				uploadButton.disabled = true;
			}
		});
		inputText.addEventListener("keyup", function(event) {
			// Number 13 is the "Enter" key on the keyboard
			if (event.keyCode === 13) {
				// Cancel the default action, if needed
				event.preventDefault();
				handyKey = inputText.value;
				GM_setValue('handy_key', handyKey);
				console.log(scriptUrl);
				if (scriptUrl) {
					uploadButton.disabled = false;
				} else {
					uploadButton.disabled = true;
				}
			}
		});
		
		uploadButton.addEventListener("click", function(event) {
			event.preventDefault();
			hand.onReady(handyKey, scriptUrl);
		});

		/*inputOffsetI.addEventListener("keyup", function(event) {
			if (event.keyCode === 13) {
				event.preventDefault();
				hand.setOffset(inputOffsetI.value);
			}
		});
		inputText.addEventListener("keyup", function(event) {
			// Number 13 is the "Enter" key on the keyboard
			if (event.keyCode === 13) {
				// Cancel the default action, if needed
				event.preventDefault();
				handyKey = inputText.value;
				hand.onReady(handyKey, scriptUrl);
			}
		});*/


		finputText.addEventListener("change", function(event) {
			var files = event.target.files; // FileList object

			var filename = window.location.href.substr(window.location.href.indexOf("viewkey=")+8);

			var formData = new FormData();
			formData.set("syncFile", new File(files, filename + ".funscript")); //TODO: csv upload?

			GM_xmlhttpRequest({
				method: "POST",
				url: "https://www.handyfeeling.com/api/sync/upload",
				data:formData,
				context: {
					scriptUrl: scriptUrl,
				},
				onload: function(response) {
					var context = response.context || this.context || context;
					var jsonResponse = response.responseText;
					if (response.status == 200) {
						document.getElementById("state").innerHTML += "<li>Script Uploaded to Handy Servers!</li>";
						scriptUrl = JSON.parse(jsonResponse).url;
						console.log(handyKey);
						if (handyKey) {
							uploadButton.disabled = false;
						} else {
							uploadButton.disabled = true;
						}
					} else {
						document.getElementById("state").innerHTML += "<li>Error " + response.status + " occurred when trying to upload your file.</li>";
					}
					console.log(jsonResponse);
				}
			});

			event.preventDefault();
		}, false);

		videoObj.addEventListener("play", onplay);
		videoObj.addEventListener("playing", onplay);
		//videoObj.addEventListener("progress", onplay);

		videoObj.addEventListener("seeked", onplay);
		videoObj.addEventListener("seeking", onpause);

		videoObj.addEventListener("pause", onpause);
		videoObj.addEventListener("waiting", onpause);

		console.log("Done!");
	}

	//init();
  shouldLoad();

})();
