import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// The assistant's product knowledge lives as plain .txt files in
// backend/knowledge/ rather than a JS string, specifically so it can be
// edited (or new topics added) without touching code — read fresh on
// every call, not cached, so an edit takes effect on the very next
// message with no restart needed. Files are concatenated in filename
// order, hence the numeric prefixes (00-, 01-, ...).
const KNOWLEDGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../knowledge')

export function loadKnowledgeBase() {
  const files = readdirSync(KNOWLEDGE_DIR)
    .filter((name) => name.endsWith('.txt'))
    .sort()

  return files
    .map((name) => readFileSync(join(KNOWLEDGE_DIR, name), 'utf-8').trim())
    .join('\n\n---\n\n')
}
