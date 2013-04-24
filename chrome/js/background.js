'use strict';
var clickCount = 0;
function onMessage(request, sender, sendResponse) {
    var tabid = sender.tab.id;
    chrome.pageAction.show(tabid);
    chrome.tabs.executeScript(tabid, {file:'/js/contentscript.js'});
    chrome.tabs.insertCSS(tabid, {file:'/stylesheets/splitochrome.css'});
    chrome.pageAction.onClicked.addListener(function(tab) {
        clickCount++;
        console.log("Click #" + clickCount);
        chrome.tabs.sendMessage(tabid, {});
    });
    sendResponse({});
};

// Listen for the content script to send a message to the background page.
chrome.extension.onMessage.addListener(onMessage);
