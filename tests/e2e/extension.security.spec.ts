import type { Page } from "@playwright/test"
import { expect, test } from "./extension.fixture"

type ObservedResponse = {
  readonly url: string
  readonly status: number
  readonly ok: boolean
}

type FailedRequest = {
  readonly url: string
  readonly errorText: string
}

async function probeBlobResources(page: Page) {
  return page.evaluate(async () => {
    const canvas = document.createElement("canvas")
    canvas.width = 16
    canvas.height = 16
    const context = canvas.getContext("2d")
    const gradient = context?.createLinearGradient(0, 0, 16, 16)
    gradient?.addColorStop(0, "#123456")
    gradient?.addColorStop(1, "#abcdef")
    if (context && gradient) {
      context.fillStyle = gradient
      context.fillRect(0, 0, 16, 16)
    }
    document.body.append(canvas)

    const image = new Image()
    const imageUrl = URL.createObjectURL(
      new Blob(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="green"/></svg>',
        ],
        { type: "image/svg+xml" },
      ),
    )
    const imageLoaded = await new Promise<boolean>((done) => {
      image.onload = () => done(image.naturalWidth === 2)
      image.onerror = () => done(false)
      image.src = imageUrl
      document.body.append(image)
    })

    const samples = 800
    const wav = new Uint8Array(44 + samples)
    const view = new DataView(wav.buffer)
    const writeAscii = (offset: number, value: string) => {
      for (const [index, character] of [...value].entries()) {
        view.setUint8(offset + index, character.charCodeAt(0))
      }
    }
    writeAscii(0, "RIFF")
    view.setUint32(4, 36 + samples, true)
    writeAscii(8, "WAVEfmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 8000, true)
    view.setUint32(28, 8000, true)
    view.setUint16(32, 1, true)
    view.setUint16(34, 8, true)
    writeAscii(36, "data")
    view.setUint32(40, samples, true)
    wav.fill(128, 44)

    const media = document.createElement("audio")
    const mediaUrl = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }))
    const mediaLoaded = await new Promise<boolean>((done) => {
      media.onloadeddata = () => done(true)
      media.onerror = () => done(false)
      media.src = mediaUrl
    })

    const frame = document.createElement("iframe")
    const frameUrl = URL.createObjectURL(
      new Blob(['<p id="task6-blob-frame">ready</p>'], { type: "text/html" }),
    )
    const frameLoaded = await new Promise<boolean>((done) => {
      frame.onload = () =>
        done(
          frame.contentDocument?.getElementById("task6-blob-frame")
            ?.textContent === "ready",
        )
      frame.onerror = () => done(false)
      frame.src = frameUrl
      document.body.append(frame)
    })

    const result = {
      canvasPainted: context?.getImageData(8, 8, 1, 1).data[3] === 255,
      frameLoaded,
      frameUrl,
      imageLoaded,
      imageUrl,
      mediaLoaded,
      mediaUrl,
    }
    URL.revokeObjectURL(imageUrl)
    URL.revokeObjectURL(mediaUrl)
    URL.revokeObjectURL(frameUrl)
    image.remove()
    media.remove()
    frame.remove()
    canvas.remove()
    return result
  })
}

test("loads both Noto SC families from successful packaged WOFF2 responses", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  // Given: network and page-error observation on the unpacked Home
  const page = await extensionContext.newPage()
  const requestUrls: string[] = []
  const fontResponses: ObservedResponse[] = []
  const failedRequests: FailedRequest[] = []
  const pageErrors: string[] = []
  page.on("request", (request) => requestUrls.push(request.url()))
  page.on("response", (response) => {
    if (/\.woff2(?:$|\?)/.test(response.url())) {
      fontResponses.push({
        ok: response.ok(),
        status: response.status(),
        url: response.url(),
      })
    }
  })
  page.on("requestfailed", (request) => {
    failedRequests.push({
      errorText: request.failure()?.errorText ?? "unknown request failure",
      url: request.url(),
    })
  })
  page.on("pageerror", (error) => pageErrors.push(error.message))
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)

  // When: representative Simplified Chinese glyphs load from both families
  const loadedFamilies = await page.evaluate(async () => {
    const sansQuery = '400 16px "Noto Sans SC Variable"'
    const serifQuery = '550 16px "Noto Serif SC Variable"'
    const sansFaces = await document.fonts.load(sansQuery, "本地字体")
    const serifFaces = await document.fonts.load(serifQuery, "离线宋体")
    return {
      sans: sansFaces.length > 0 && document.fonts.check(sansQuery, "本地字体"),
      serif:
        serifFaces.length > 0 && document.fonts.check(serifQuery, "离线宋体"),
    }
  })
  const pageFontFamily = await page
    .locator("[data-page-id]")
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily)
  const remoteFontRequests = requestUrls.filter((url) =>
    /https:\/\/fonts\.(?:googleapis|gstatic)\.com/.test(url),
  )
  const failedExtensionRequests = failedRequests.filter((request) =>
    request.url.startsWith(`chrome-extension://${extensionId}/`),
  )

  await testInfo.attach("task-6-local-font-network.json", {
    body: JSON.stringify(
      {
        failedExtensionRequests,
        fontResponses,
        loadedFamilies,
        remoteFontRequests,
      },
      null,
      2,
    ),
    contentType: "application/json",
  })

  // Then: both families are usable and every font response is local and successful
  expect(loadedFamilies).toEqual({ sans: true, serif: true })
  expect(pageFontFamily).toContain("Noto Sans SC Variable")
  expect(remoteFontRequests).toEqual([])
  expect(fontResponses.length).toBeGreaterThanOrEqual(2)
  expect(
    fontResponses.some((response) => /noto-sans-sc/.test(response.url)),
  ).toBe(true)
  expect(
    fontResponses.some((response) => /noto-serif-sc/.test(response.url)),
  ).toBe(true)
  expect(
    fontResponses.every(
      (response) =>
        response.ok &&
        response.status === 200 &&
        response.url.startsWith(`chrome-extension://${extensionId}/assets/`),
    ),
  ).toBe(true)
  expect(failedExtensionRequests).toEqual([])
  expect(pageErrors).toEqual([])
})

test("permits declared blob resources and canvas painting under Extension CSP", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  // Given: the unpacked Home and its active packaged manifest policy
  const page = await extensionContext.newPage()
  const cspErrors: string[] = []
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy/i.test(message.text())
    ) {
      cspErrors.push(message.text())
    }
  })
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const manifestText = await page.evaluate(async (manifestUrl) => {
    const response = await fetch(manifestUrl)
    return response.text()
  }, `chrome-extension://${extensionId}/manifest.json`)

  // When: canvas, image, media, and frame capability fixtures run on that origin
  const probe = await probeBlobResources(page)
  await testInfo.attach("task-6-csp-blob-probe.json", {
    body: JSON.stringify({ cspErrors, probe }, null, 2),
    contentType: "application/json",
  })

  // Then: each fixture succeeds and the loaded policy keeps blob sources explicit
  expect(
    probe,
    cspErrors.join("\n") || "No CSP errors were observed",
  ).toMatchObject({
    canvasPainted: true,
    frameLoaded: true,
    imageLoaded: true,
    mediaLoaded: true,
  })
  const blobOrigin = `blob:chrome-extension://${extensionId}/`
  expect(probe.imageUrl.startsWith(blobOrigin)).toBe(true)
  expect(probe.mediaUrl.startsWith(blobOrigin)).toBe(true)
  expect(probe.frameUrl.startsWith(blobOrigin)).toBe(true)
  expect(manifestText).toMatch(/img-src[^;"]*blob:/)
  expect(manifestText).toMatch(/media-src[^;"]*blob:/)
  expect(cspErrors).toEqual([])
})
