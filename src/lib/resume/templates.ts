export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  style: "modern" | "classic" | "minimal" | "creative";
  fontFamily: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean, contemporary design with accent colors",
    style: "modern",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    colors: {
      primary: "#1e40af",
      secondary: "#64748b",
      accent: "#3b82f6",
    },
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional, professional layout",
    style: "classic",
    fontFamily: "Georgia, serif",
    colors: {
      primary: "#1a1a1a",
      secondary: "#666666",
      accent: "#333333",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple, clean design with lots of whitespace",
    style: "minimal",
    fontFamily: "Helvetica, Arial, sans-serif",
    colors: {
      primary: "#000000",
      secondary: "#555555",
      accent: "#333333",
    },
  },
  {
    id: "creative",
    name: "Creative",
    description: "Bold design for creative roles",
    style: "creative",
    fontFamily: "Poppins, -apple-system, BlinkMacSystemFont, sans-serif",
    colors: {
      primary: "#7c3aed",
      secondary: "#6b7280",
      accent: "#8b5cf6",
    },
  },
];

export function getTemplate(id: string): ResumeTemplate {
  return RESUME_TEMPLATES.find((t) => t.id === id) ?? RESUME_TEMPLATES[0];
}
