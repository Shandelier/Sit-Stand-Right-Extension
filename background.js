function blurPage(tab) {
    console.log("bluuuuur")
}

let mycss = "body {background-color: coral;}"

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: blurPage,
        args: [tab]
    })
    chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["css/blur.css"]
    });
});