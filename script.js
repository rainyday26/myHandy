// ==UserScript==
// @name		 theHandy support for PornHub
// @namespace	http://tampermonkey.net/
// @version	  2.1.1
// @downloadURL https://raw.githubusercontent.com/rainyday26/myHandy/master/script.js
// @updateURL https://raw.githubusercontent.com/rainyday26/myHandy/master/script.js
// @description  Web support for the Handy
// @author	   Nodude
// @match		*://*/*
// @grant		GM_xmlhttpRequest
// @grant   GM_setValue
// @grant   GM_getValue
// @require	  http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @run-at	   document-idle
// ==/UserScript==

//Inspired by notSafeForDev
//Backported changes by jabiim

/*
Update 2.1
A bit nicer UI
Update 2.0
Closable and reopenable window by jabiim
Update 1.9
It now remembers the handykey
Update 1.8
Z-Index fix
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

const handyLogo = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 595.28 794.16" style="height: 40px" xml:space="preserve">
<style type="text/css">
	.st0{fill:#ffffff;}
</style>
<path class="st0" d="M288.75,215.21v269.21c0,41.39-34.24,75.25-75.58,73.34c-38.18-1.77-68.86-33.55-68.86-72.14V216.31
	c0-38.97,30.44-71.74,69.38-73.26c20.98-0.82,40.13,7.44,53.85,21.16C280.62,177.29,288.75,195.35,288.75,215.21z"></path>
<path class="st0" d="M451.03,387.79v162.69H306.59V387.79c0-39.73,32.5-72.22,72.22-72.22
	C418.53,315.57,451.03,348.06,451.03,387.79z"></path>
</svg>`;

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

class Config {
  constructor() {}
  setValue(key, value) {
    GM_setValue(key, value);
  }
  getValue(key) {
    return GM_getValue(key);
  }
  getValue(key, other) {
    return GM_getValue(key, other);
  }
  //TODO: Move website supported here
  
  getHandyKey() {
    return this.getValue("handy_key", null);
  }
  setHandyKey(key) {
    this.setValue("handy_key", key);
  }
  getHandyDelay() {
    return this.getValue("handy_delay", null);
  }
  setHandyDelay(key) {
    this.setValue("handy_delay", key);
  }
  getMenuShown() {
    return this.getValue("menu", true);
  }
  setMenuShown(value) {
    this.setValue("menu", value);
  }
}



(function() {
	'use strict';
	
	var scriptUrl = null;
	var videoObj = null;
	const hand = new Hander();
  const cfg = new Config();
	
	function getElementByXpath(path) {
		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	}
	
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	function shouldHand() {
		//console.log(scriptUrl, handyKey);
		return scriptUrl != null && cfg.getHandyKey() != null;
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
		window.style = `
			position: absolute; 
			top: 0px; 
			left: 0px; 
			z-index: 2147483647; 
			background-color: rgb(119, 119, 119);
			color: #000000; 
			text-align: center; 
      max-width: 30%;
      max-height: 25%;
      min-width: 400px;
      min-height: 300px;
		`;
		window.id = "nodudewashere";
		head.appendChild(window);
		
		const header = document.createElement("div");
		header.innerHTML = `
			<span>theHandy support for The Web</span>
		`;

		header.style =  `
			padding: 10px; 
			cursor: move; 
			z-index: 2147483648; 
			background-color: rgb(33,37,41);
			color: #fff;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		`;
		window.appendChild(header);

		const iconRef = document.createElement("div");
		const closeRef = document.createElement("span");

		closeRef.style=`
			padding: 5px;
			cursor: pointer
		`;
		closeRef.innerHTML='x';
		header.appendChild(closeRef);

		console.log(closeRef);

		closeRef.addEventListener('mousedown', ()=>{
			console.log('clicked');

			window.style.display = 'none';
      cfg.setMenuShown(false);
			iconRef.style.display = 'flex';
		});

		iconRef.style = `
			background-color: #000;
			border: 1px solid #ccc;
			border-radius: 5px;
      z-index: 2147483648; 
			position: fixed;
			height: 50px;
			width: 50px;
			bottom: 5px;
			right: 5px;
			display: none;
			align-items: center;
			justify-content: center;
			cursor: pointer
		`;
		iconRef.innerHTML = handyLogo;

		iconRef.addEventListener('mousedown', ()=>{
			window.style.display = 'block';
      cfg.setMenuShown(true);
			iconRef.style.display = 'none';
		});

		head.appendChild(iconRef);

		
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
		
    //Default to hidden
		window.style.display = cfg.getMenuShown() ? "block" : "none";
    iconRef.style.display = cfg.getMenuShown() ? "none" : "flex";

		return window;
	}
	
  //TODO: Move to config
	async function shouldLoad() {
		await GM_xmlhttpRequest({
			//TODO: Should be release relative
			url: "https://raw.githubusercontent.com/rainyday26/myHandy/master/data.json",
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
		inputText.style.backgroundImage = 'none';
		inputText.type = "search"; //Tell the pesky password managers to fuck off
		inputText.value = cfg.getHandyKey();
		inputText.placeholder = "Enter connection key";
		inputText.style.display = 'block';
		
		const uploadButton = document.createElement("input");
		uploadButton.className = 'submit-comment xh-button large red'
		uploadButton.style.marginBottom = '4px';
		uploadButton.type = 'button';
		uploadButton.value = "Sync to the handy";
		uploadButton.disabled = true;
		uploadButton.style.display = 'block';
		
		selecting.appendChild(inputText);
		
		selecting.appendChild(finputText);
		
		const inputOffset = document.createElement("label");
		inputOffset.innerHTML += 'Offset:<input class="input-text" style="display: inline-block; width: 200px; margin-left: 4px" type="number" name="Offset" value="0"><span> ms</span></label>';
		selecting.appendChild(inputOffset);
		
		//selecting.appendChild(setVidButton);
		selecting.appendChild(uploadButton);
		
		const inputOffsetI = inputOffset.getElementsByTagName("input")[0];
		inputOffsetI.style.marginBottom = '4px';
		inputOffsetI.value = cfg.getHandyDelay();
		
		
		var txt = document.createElement("a");
    txt.innerHTML = "Log";
		selecting.appendChild(txt);
    
		
		var stats = document.createElement("div");
		stats.id="state";
    stats.style.maxWidth="100%";
    stats.style.height="150px"; //maxHeight doesn't work, for some reason
    stats.style.overflow="scroll";
    stats.style.textAlign="left";
    stats.style.backgroundColor="rgb(119, 119, 119)";
    stats.style.color="rgb(255,144,0)";

		selecting.appendChild(stats);
		
		
		var root_ui = funnyui();
		root_ui.appendChild(selecting);
		
		function setOffset() {
			const handydelay = inputOffsetI.value;
      cfg.setHandyDelay(handydelay);
			hand.setOffset(handydelay);
		}

		inputOffsetI.addEventListener("blur", function(event) {
			setOffset();
		});
		
		inputOffsetI.addEventListener("keyup", function(event) {
			if (event.keyCode === 13) {
				event.preventDefault();
				setOffset();
			}
		});
		
		function setKey() {
			const handyKey = inputText.value;
      cfg.setHandyKey(handyKey);
			console.log(scriptUrl);
			if (scriptUrl) {
				uploadButton.disabled = false;
			} else {
				uploadButton.disabled = true;
			}
		}
		
		inputText.addEventListener("blur", function(event) {
			setKey();
		});

		inputText.addEventListener("keyup", function(event) {
			// Number 13 is the "Enter" key on the keyboard
			if (event.keyCode === 13) {
				// Cancel the default action, if needed
				event.preventDefault();
				setKey();
			}
		});
		
		uploadButton.addEventListener("click", function(event) {
			event.preventDefault();
			hand.onReady(handyKey, scriptUrl);
		});
		
		
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
						console.log(cfg.getHandyKey());
						if (cfg.getHandyKey()) {
							uploadButton.disabled = false;
						} else {
							uploadButton.disabled = true;
						}
					} else {
						document.getElementById("state").innerHTML += "<li>Error " + response.status + " occurred when trying to upload your file.</li>";
					}
					console.log(jsonResponse);
					try {
						hand.onReady(cfg.getHandyKey(), scriptUrl);
					} catch (err) {
						console.log("Not ready yet", err)
					}
				}
			});
			
			event.preventDefault();
		}, false);
		
		//Video listening
		while (videoObj==null) {
			videoObj = getElementByXpath(xpth);
			await sleep(100);
		}
		
		videoObj.addEventListener("play", onplay);
		videoObj.addEventListener("playing", onplay);
		//videoObj.addEventListener("progress", onplay);
		
		videoObj.addEventListener("seeked", onplay);
		videoObj.addEventListener("seeking", onpause);
		
		videoObj.addEventListener("pause", onpause);
		videoObj.addEventListener("waiting", onpause);
		
		console.log("Done!");
	}
  
  
  function unfinished_functionality() {
    window.addEventListener('mouseover', function (e) {
        updateMask(e.target);
    });

    function updateMask(target) {
        let elements = document.getElementsByClassName("highlight-wrap")
        let hObj
        if (elements.length !== 0) {
            hObj = elements[0]
        } else {
            hObj = document.createElement("div");
            hObj.className = 'highlight-wrap';
            hObj.style.position = 'absolute';
            hObj.style.backgroundColor = '#205081';
            hObj.style.opacity = '0.5';
            hObj.style.cursor = 'default';
            hObj.style.pointerEvents = 'none';
            document.body.appendChild(hObj);
        }
        let rect = target.getBoundingClientRect();
        hObj.style.left = (rect.left + window.scrollX) + "px";
        hObj.style.top = (rect.top + window.scrollY) + "px";
        hObj.style.width = rect.width + "px";
        hObj.style.height = rect.height + "px";
    }
  }
  
	
	shouldLoad();
	
})();
