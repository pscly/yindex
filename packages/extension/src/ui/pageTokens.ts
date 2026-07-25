import type { AdaptiveGlassInput, Page, StyleTokens } from "@yindex/domain"
import { pageStyleToTokens } from "@yindex/domain"
import { localFontFamily } from "./localFontFamilies"

export function pageTokensOf(
  page: Page,
  analysis?: AdaptiveGlassInput | null,
): StyleTokens {
  const tokens = pageStyleToTokens(page.style, analysis)
  return {
    ...tokens,
    typography: {
      ...tokens.typography,
      bodyFamily: localFontFamily(tokens.typography.bodyFamily),
      displayFamily: localFontFamily(tokens.typography.displayFamily),
    },
  }
}
