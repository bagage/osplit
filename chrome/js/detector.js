var regex = /OE20\d\d © Stephan Krämer 20\d\d/;
if (regex.test(document.body.innerText)) {
    chrome.extension.sendMessage({}, function(response) {});
}
