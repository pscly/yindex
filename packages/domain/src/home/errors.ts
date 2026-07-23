export type HomeError =
  | { readonly code: "page_not_found"; readonly message: string }
  | { readonly code: "widget_not_found"; readonly message: string }
  | { readonly code: "sequence"; readonly message: string }
  | { readonly code: "invalid"; readonly message: string }
