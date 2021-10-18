class ActiveTabTracker {
  constructor () {
    this._activeTab = {}
    this._tracker = []
  }

  static effects = {
    blur: 'blur',
    grey: 'grey'
  }

  setNewActiveTab (tab) {
    this._activeTab = tab
    this.addTabToTracker(tab)
  }

  addTabToTracker (tab) {
    if (this.getTabIndex(tab) === -1) {
      tab.blur = false
      tab.grey = false
      this._tracker.push(tab)
    }
  }

  getTabIndex (tab) {
    var windowId = tab.windowId
    var tabId = tab.tabId
    var index = this._tracker.findIndex(t => {
      return t.tabId === tabId && t.windowId === windowId
    })
    return index
  }

  getTracker () {
    return this._tracker
  }

  getTabStatus (tab) {
    var index = this.getTabIndex(tab)
    console.log('index', index)
    console.log('tab under index', this._tracker[index])
    return this._tracker[index].blur
  }

  setTabStatus (index, status) {
    console.log('settabstatus')
    console.log('tab index', index)
    this._tracker[index].blur = status
  }
}

let isSlouching = false
let currentSlouchingEffect = 'blur'
let tabTracker = new ActiveTabTracker()

function updateEffect (isSlouching, tab) {
  var tabEffectState = tabTracker.getTabStatus(tab)
  var tabIndex = tabTracker.getTabIndex(tab)
  if (isSlouching !== tabEffectState) {
    if (isSlouching) {
      chrome.tabs.insertCSS(null, { file: 'css/blur.css' })
      tabTracker.setTabStatus(tabIndex, true)
      return
    }
    chrome.tabs.insertCSS(null, { file: 'css/normal.css' })
    tabTracker.setTabStatus(tabIndex, false)
    return
  }
}

chrome.browserAction.onClicked.addListener(function (activeInfo) {
  var tab = { tabId: activeInfo.id, windowId: activeInfo.windowId }
  isSlouching = !isSlouching
  updateEffect(isSlouching, tab)
})

chrome.tabs.onActivated.addListener(function (tab) {
  tabTracker.setNewActiveTab(tab)
  updateEffect(isSlouching, tab)
})
