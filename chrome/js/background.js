'use strict';
function onMessage(msg, sender) {
	var tabid = sender.tab.id;
	
	switch (msg.cmd) {
	case 'oedetected':
		console.log("OE document detected, inject script");
	    chrome.tabs.executeScript(tabid, {file:'/js/contentscript.js'}, function() {
	    	chrome.tabs.sendMessage(tabid, {cmd:'parse'});
	    });
		break;
	case 'parseok':
		console.log("OE document detected with " + msg.count + " circuits");
		if (msg.count) {
			chrome.tabs.insertCSS(tabid, {
				file : '/stylesheets/splitochrome.css'
			});
			chrome.pageAction.show(tabid);

			chrome.pageAction.onClicked.addListener(function(tab) {
				// do not reuse tabid here!
				chrome.tabs.sendMessage(tab.id, {
					cmd : 'showtables'
				});
			});
		}
		break;
	}

	
};
// Listen for the content script to send a message to the background page.
chrome.extension.onMessage.addListener(onMessage);
