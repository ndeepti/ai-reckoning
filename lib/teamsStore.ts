// In-memory ring buffer for Teams messages received via Power Automate webhook.
// Persists to /tmp/teams-messages.json so messages survive dev-server restarts.

import fs from 'fs'

export interface LiveTeamsMessage {
  id: string
  channel: string        // 'chip1-releases' | 'Chip1-Integration'
  author: string
  role: string
  time: string           // HH:MM
  text: string
  isAlert: boolean
  receivedAt: number     // epoch ms
}

const MAX = 200
const PERSIST_PATH = '/tmp/teams-messages.json'

function loadFromDisk(): LiveTeamsMessage[] {
  try {
    return JSON.parse(fs.readFileSync(PERSIST_PATH, 'utf8'))
  } catch { return [] }
}

function saveToDisk(msgs: LiveTeamsMessage[]) {
  try { fs.writeFileSync(PERSIST_PATH, JSON.stringify(msgs)) } catch { /* ignore */ }
}

const store: LiveTeamsMessage[] = loadFromDisk()
const subscribers = new Set<(msg: LiveTeamsMessage) => void>()

export function pushMessage(msg: Omit<LiveTeamsMessage, 'id' | 'receivedAt'>) {
  const full: LiveTeamsMessage = {
    ...msg,
    id: crypto.randomUUID(),
    receivedAt: Date.now(),
  }
  store.unshift(full)
  if (store.length > MAX) store.pop()
  saveToDisk(store)
  subscribers.forEach((fn) => fn(full))
  return full
}

export function getMessages(channel?: string): LiveTeamsMessage[] {
  return channel ? store.filter((m) => m.channel === channel) : [...store]
}

export function subscribe(fn: (msg: LiveTeamsMessage) => void) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
