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
var regex = /\w\w20\d\d © Stephan Krämer 20\d\d/;
var gecoDataUrl = document.documentElement.getAttribute('data-gecodatajs');
if (gecoDataUrl) {
    chrome.extension.sendMessage({cmd:'gecodetected'});
}
else {
    var scriptTag = document.getElementById('gecoOrienteeringResults');
    if (scriptTag) {
        window.addEventListener("message", function(event) {
            // We only accept messages from ourselves
            if (event.source != window)
              return;
            var msg = event.data;
            console.log("O'Splits: detector receiving window msg:" + msg.cmd);
            if(msg.cmd==='jsonResponse'){
                window.gecoOrienteeringResults = msg.data;
                chrome.extension.sendMessage({cmd:'gecodetected', old:true});
            }
        });
        window.postMessage({cmd:'getJson'}, '*');
    }
    else if (regex.test(document.body.innerText)) {
        chrome.extension.sendMessage({cmd:'oedetected'});
    }
}