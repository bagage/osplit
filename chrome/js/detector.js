var regex = /\w\w20\d\d © Stephan Krämer 20\d\d/;
var gecoDataUrl = document.documentElement.getAttribute('data-gecodatajs');
if (gecoDataUrl) {
////    chrome.extension.sendMessage({cmd:'geconewdetected', gecoDataUrl:gecoDataUrl});
//    window.addEventListener("message", function(event) {
//        // We only accept messages from ourselves
//        if (event.source != window)
//          return;
//        if(event.data.cmd==='jsonDataReady'){
//            window.gecoOrienteeringResults = event.data.data;
//            chrome.extension.sendMessage({cmd:'gecodetected'});
//        }
//    });
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