/**
 * Design-system metadata for docs and the showcase page.
 */

export const designSystemMeta = {
  name: "Dr. Vandana Wellness Design System",
  version: "1.0.0",
  tagline: "Your Mental Well-being Matters.",
  principles: [
    "Calm and emotionally safe",
    "Premium but approachable",
    "Accessible by default",
    "Reuse before inventing",
    "No regression to navigation or booking flows",
  ],
  stackPolicy: {
    preferExisting: true,
    shadcn: "optional-future-selective",
    reactBits: "not-used",
    motion: "not-used-css-sufficient",
    figmaRuntime: "not-required",
  },
} as const;
