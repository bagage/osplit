/**
  O'Splits - Orienteering Results Viewer
  
  Copyright (C) 2013 by Jan Vorwerk <jan.vorwerk @@ angexis dot com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
var tabs={};

chrome.pageAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, {
        cmd : 'showtables'
    });
});


function onMessage(msg, sender) {
    var tabid = sender.tab.id;
    console.log("O'Splits: background receiving window msg:" + msg.cmd);
    switch (msg.cmd) {
    case 'oedetected':
        console.log("O'Splits: OE document detected, injecting script");
        chrome.tabs.executeScript(tabid, {file:'/js/jquery-2.0.0.min.js'}, function() {
            chrome.tabs.executeScript(tabid, {file:'/js/contentscript.js'}, function() {
                chrome.tabs.sendMessage(tabid, {cmd:'parse'});
            });
        });

        break;
    case 'gecodetected':
        console.log("O'Splits: Geco detected, injecting script");
        chrome.tabs.executeScript(tabid, {file:'/js/jquery-2.0.0.min.js'}, function() {
            chrome.tabs.executeScript(tabid, {file:'/js/contentscript.js'}, function() {
                if (msg.old) {
                    chrome.tabs.sendMessage(tabid, {cmd:'readJson'});
                }
                else {
                    chrome.tabs.sendMessage(tabid, {cmd:'loadJsonData'});
                }

            });
        });
        break;
    case 'parseok':
        console.log("O'Splits: document detected with " + msg.count + " circuits");
        if (msg.count) {
            chrome.tabs.insertCSS(tabid, {
                file : '/stylesheets/splitochrome.css'
            });
            chrome.pageAction.show(tabid);
        }
        break;
    }

    
};
// Listen for the content script to send a message to the background page.
chrome.extension.onMessage.addListener(onMessage);
