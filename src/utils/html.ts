import sanitizeHtml from "sanitize-html";

import { splitIntoParagraphs, stripHtml, truncateText } from "./text.js";

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ["p", "a", "strong", "em", "ul", "ol", "li", "br"],
  allowedAttributes: {
    a: ["href", "target", "rel"]
  },
  allowedSchemes: ["http", "https", "mailto"]
};

export function sanitizeFragment(fragment: string): string {
  return sanitizeHtml(fragment, sanitizeOptions);
}

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildFallbackSummary(rawText: string): string {
  const clean = stripHtml(rawText);
  const paragraphs = splitIntoParagraphs(clean, 3);
  return (paragraphs.length ? paragraphs : [truncateText(clean, 360)]).join("\n\n");
}

export function buildDescriptionHtml(summary: string): string {
  const clean = truncateText(stripHtml(summary), 240);
  return sanitizeFragment(`<p>${clean}</p>`);
}

export function buildContentHtml(summary: string, sourceName: string, canonicalUrl: string): string {
  const paragraphs = splitIntoParagraphs(summary, 4);
  const body = (paragraphs.length ? paragraphs : [summary])
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");

  return sanitizeFragment(
    `${body}<p><strong>Fuente:</strong> ${sourceName}. <a href="${canonicalUrl}" target="_blank" rel="noopener noreferrer">Leer original</a></p>`
  );
}
