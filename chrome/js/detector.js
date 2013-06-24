var regex = /\w\w20\d\d © Stephan Krämer 20\d\d/;
var scriptTag = document.getElementById('gecoOrienteeringResults');
if (scriptTag) {
    window.addEventListener("message", function(event) {
        // We only accept messages from ourselves
        if (event.source != window)
          return;
        if(event.data.cmd==='jsonResponse'){
            window.gecoOrienteeringResults = event.data.data;
            chrome.extension.sendMessage({cmd:'gecodetected'});
        }
    });
    window.postMessage({cmd:'getJson'}, '*');
}
else if (regex.test(document.body.innerText)) {
    chrome.extension.sendMessage({cmd:'oedetected'});
}
