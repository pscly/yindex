chrome.runtime.onInstalled.addListener(() => {
  console.info("yindex installed")
})

// Keep SW lightweight; heavy work stays in newtab page.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("pkg:")) {
    console.info("yindex alarm", alarm.name)
  }
})
