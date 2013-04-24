var clickCount = 0;
function onMessage(request, sender, sendResponse) {
  chrome.pageAction.show(sender.tab.id);
  chrome.pageAction.onClicked.addListener(function(tab) {
    clickCount++;
    console.log("Click #" + clickCount);
    chrome.tabs.sendMessage(sender.tab.id,{});
  });
  sendResponse({});
};

// Listen for the content script to send a message to the background page.
chrome.extension.onMessage.addListener(onMessage);

