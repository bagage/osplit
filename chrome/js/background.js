'use strict';
function onMessage(request, sender) {
    var tabid = sender.tab.id;
    chrome.pageAction.show(tabid);
    chrome.tabs.executeScript(tabid, {file:'/js/contentscript.js'});
    chrome.tabs.insertCSS(tabid, {file:'/stylesheets/splitochrome.css'});
    
    chrome.tabs.sendMessage(tabid, {cmd:'parse'});

    chrome.pageAction.onClicked.addListener(function(tab) {
        chrome.tabs.sendMessage(tabid, {cmd:'showtables'});
    });
};

// Listen for the content script to send a message to the background page.
chrome.extension.onMessage.addListener(onMessage);
