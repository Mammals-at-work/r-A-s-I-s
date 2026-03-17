export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeTitle(input: string): string {
  return stripHtml(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(the|a|an|and|or|de|la|el|los|las)\b/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): Set<string> {
  return new Set(
    normalizeTitle(input)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 2)
  );
}

export function jaccardSimilarity(left: string, right: string): number {
  const a = tokenize(left);
  const b = tokenize(right);

  if (!a.size || !b.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  return intersection / (a.size + b.size - intersection);
}

export function truncateText(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function splitIntoParagraphs(input: string, maxParagraphs: number): string[] {
  const sentences = normalizeWhitespace(input)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (!sentences.length) {
    return [];
  }

  const paragraphs: string[] = [];
  const paragraphSize = Math.max(1, Math.ceil(sentences.length / maxParagraphs));

  for (let index = 0; index < sentences.length; index += paragraphSize) {
    paragraphs.push(sentences.slice(index, index + paragraphSize).join(" "));
  }

  return paragraphs.slice(0, maxParagraphs);
}
