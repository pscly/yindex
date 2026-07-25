export type ExecutableProbeResult = {
  readonly blobScript: boolean
  readonly eval: boolean
  readonly inlineScript: boolean
  readonly remoteScript: boolean
  readonly stringTimer: boolean
}

function scriptIsBlocked(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement("script")
    const finish = (blocked: boolean) => {
      script.remove()
      resolve(blocked)
    }
    script.addEventListener("load", () => finish(false), { once: true })
    script.addEventListener("error", () => finish(true), { once: true })
    try {
      script.src = url
      document.head.append(script)
    } catch {
      finish(true)
    }
  })
}

export async function probeBlockedExecutables(): Promise<ExecutableProbeResult> {
  const blobScriptUrl = URL.createObjectURL(
    new Blob(["document.documentElement.dataset.task6BlobScript = 'ran'"], {
      type: "text/javascript",
    }),
  )
  const evaluator = Reflect.get(globalThis, "eval")
  let evalBlocked = false
  try {
    if (typeof evaluator === "function") {
      evaluator("document.documentElement.dataset.task6Eval = 'ran'")
    }
  } catch {
    evalBlocked = true
  }
  let stringTimerBlocked = false
  try {
    window.setTimeout(
      "document.documentElement.dataset.task6StringTimer = 'ran'",
      0,
    )
  } catch {
    stringTimerBlocked = true
  }
  let inlineScriptBlocked = false
  try {
    const inlineScript = document.createElement("script")
    inlineScript.text = "document.documentElement.dataset.task6Inline = 'ran'"
    document.head.append(inlineScript)
    inlineScript.remove()
  } catch {
    inlineScriptBlocked = true
  }
  const [blobScript, remoteScript] = await Promise.all([
    scriptIsBlocked(blobScriptUrl),
    scriptIsBlocked("https://example.com/task6-script.js"),
  ])
  URL.revokeObjectURL(blobScriptUrl)
  await new Promise((resolve) => window.setTimeout(resolve, 0))
  return {
    blobScript,
    eval:
      evalBlocked && !document.documentElement.hasAttribute("data-task6-eval"),
    inlineScript:
      inlineScriptBlocked ||
      !document.documentElement.hasAttribute("data-task6-inline"),
    remoteScript,
    stringTimer:
      stringTimerBlocked &&
      !document.documentElement.hasAttribute("data-task6-string-timer"),
  }
}
