import { z } from "zod"
import {
  DEFAULT_GLASS_TUNING,
  GLASS_PROFILES,
  MOTION_PROFILES,
} from "../style/glass"
import { GENERATIVE_PRESETS } from "../style/wallpaper"

const layoutRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  z: z.number(),
})

const styleOverrideSchema = z
  .object({
    color: z.record(z.string()).optional(),
    typography: z.record(z.union([z.string(), z.number()])).optional(),
    space: z.record(z.number()).optional(),
    radius: z.record(z.string()).optional(),
    elevation: z.record(z.string()).optional(),
    glass: z.record(z.union([z.number(), z.boolean()])).optional(),
    motion: z.record(z.union([z.string(), z.number()])).optional(),
  })
  .partial()

const widgetSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("builtin"),
    typeId: z.string(),
  }),
  z.object({
    kind: z.literal("package"),
    packageId: z.string(),
    typeId: z.string(),
    packageVersion: z.string(),
  }),
  z.object({
    kind: z.literal("missing"),
    packageId: z.string(),
    typeId: z.string(),
    lastPackageVersion: z.string(),
    savedConfig: z.unknown(),
  }),
])

const widgetInstanceSchema = z.object({
  id: z.string(),
  source: widgetSourceSchema,
  layout: layoutRectSchema,
  config: z.unknown(),
  styleOverride: styleOverrideSchema.nullable(),
})

const seedPaletteSchema = z
  .object({
    bg: z.string(),
    surface: z.string(),
    ink: z.string(),
    muted: z.string(),
    accent: z.string(),
  })
  .catchall(z.string())

const glassTuningSchema = z.object({
  transmission: z.number().min(-0.2).max(0.2),
  blur: z.number().min(-12).max(12),
  saturation: z.number().min(-0.4).max(0.4),
  highlight: z.number().min(-0.25).max(0.25),
})

export const wallpaperSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("generative"),
    generativePreset: z.enum(GENERATIVE_PRESETS),
    dim: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal("image"),
    mediaRef: z.string().min(1),
    dim: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal("video"),
    mediaRef: z.string().min(1),
    dim: z.number().min(0).max(1),
  }),
])

const pageStyleSchema = z.object({
  seedPalette: seedPaletteSchema,
  wallpaper: wallpaperSchema,
  glassProfile: z.enum(GLASS_PROFILES),
  glassTuning: glassTuningSchema.default(DEFAULT_GLASS_TUNING),
})

const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  style: pageStyleSchema,
  widgets: z.array(widgetInstanceSchema),
})

export const homeV2Schema = z.object({
  schemaVersion: z.literal(2),
  sequence: z.object({
    pageIds: z.array(z.string()).min(1),
    landingPageId: z.string(),
  }),
  pages: z.record(pageSchema),
  settings: z.object({
    rememberLastPage: z.boolean(),
    allowHexagramRedraw: z.boolean(),
    snapEnabled: z.boolean(),
    showWidgetTitles: z.boolean().default(false),
    reducedMotion: z.enum(["system", "force", "never"]),
    locale: z.literal("zh-CN"),
    motionProfile: z.enum(MOTION_PROFILES).default("balanced"),
  }),
  lastPageId: z.string().nullable(),
})

export type HomeV2Raw = z.infer<typeof homeV2Schema>
export type WallpaperRaw = z.infer<typeof wallpaperSchema>
export type SeedPaletteRaw = z.infer<typeof seedPaletteSchema>
