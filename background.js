let state = false

chrome.browserAction.onClicked.addListener(function (tab) {
  if (!state) {
    chrome.tabs.insertCSS(null, { file: 'css/blur.css' })
    state = !state
    return
  }
  chrome.tabs.insertCSS(null, { file: 'css/normal.css' })
  state = !state
})
