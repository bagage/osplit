var regex = /\w\w20\d\d © Stephan Krämer 20\d\d/;
if (regex.test(document.body.innerText)) {
    chrome.extension.sendMessage({cmd:'oedetected'});
}
else if (window.gecoOrienteeringResults) {
    chrome.extension.sendMessage({cmd:'gecodetected'});
}
