const notoSerifSc = /(["'])Noto Serif SC\1/g
const notoSansSc = /(["'])Noto Sans SC\1/g

export function localFontFamily(family: string): string {
  return family
    .replace(notoSerifSc, '"Noto Serif SC Variable"')
    .replace(notoSansSc, '"Noto Sans SC Variable"')
}
