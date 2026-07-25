import {
  type GlassProfile,
  type HomeDocument,
  type PageId,
  type PageStyle,
  type Wallpaper,
  setPageStyle,
  withGlassProfile,
  withWallpaper,
} from "@yindex/domain"

export function applyPageStyle(
  doc: HomeDocument,
  pageId: PageId,
  style: PageStyle,
): HomeDocument | null {
  const result = setPageStyle(doc, pageId, style)
  return result.ok ? result.value : null
}

export function applyGlassProfile(
  doc: HomeDocument,
  pageId: PageId,
  pageStyle: PageStyle,
  profile: GlassProfile,
): HomeDocument | null {
  return applyPageStyle(doc, pageId, withGlassProfile(pageStyle, profile))
}

export function applyWallpaper(
  doc: HomeDocument,
  pageId: PageId,
  pageStyle: PageStyle,
  wallpaper: Wallpaper,
): HomeDocument | null {
  return applyPageStyle(doc, pageId, withWallpaper(pageStyle, wallpaper))
}
