import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DrawLint.ai — AI-Powered System Design Review",
    short_name: "DrawLint.ai",
    description: "Draw system design diagrams and get instant AI feedback from 6 specialized reviewers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
