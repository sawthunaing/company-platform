// Section bodies are plain text from the API; a blank line starts a new paragraph.
export function Paragraphs({ text }: { text: string }) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);
}
