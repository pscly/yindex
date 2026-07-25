import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/noto-sans-sc"
import "@fontsource-variable/noto-serif-sc"
import { App } from "./App"
import "./styles.css"
import { runWorkerSecurityProbe } from "./workerSecurityProbe"

const rootEl = document.getElementById("root")
if (!rootEl) {
  throw new Error("#root missing")
}

if (new URLSearchParams(location.search).has("task6-worker-probe")) {
  void runWorkerSecurityProbe()
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
