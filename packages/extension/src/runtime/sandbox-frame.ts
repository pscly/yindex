/**
 * Sandbox frame bootstrap: loads package entry HTML into an inner iframe
 * and relays bridge postMessages between package and host extension page.
 */
const params = new URLSearchParams(location.search)
const entry = params.get("entry")
const instanceId = params.get("instanceId") ?? ""

if (!entry) {
  document.body.textContent = "missing entry"
} else {
  const frame = document.createElement("iframe")
  frame.src = entry
  frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals")
  frame.style.cssText = "border:0;width:100%;height:100%"
  document.body.appendChild(frame)

  window.addEventListener("message", (event) => {
    const data = event.data as { channel?: string } | null
    if (!data || data.channel !== "yindex-bridge") return
    // Relay package → host
    if (event.source === frame.contentWindow) {
      parent.postMessage({ ...data, instanceId }, "*")
      return
    }
    // Relay host → package
    if (event.source === parent && frame.contentWindow) {
      frame.contentWindow.postMessage(data, "*")
    }
  })
}
