import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type AiProviderId = 'openai' | 'deepseek' | 'qwen' | 'custom'

export type AiSettings = {
  providerId: AiProviderId
  baseUrl: string
  model: string
  apiKey: string
  maxRows: number
}

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  sql?: string
  rowCount?: number
}

const STORAGE_KEY = 'olam_ai_settings_v1'

const nowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`

const DEFAULT_SETTINGS: AiSettings = {
  providerId: 'deepseek',
  baseUrl: '',
  model: 'deepseek-chat',
  apiKey: '',
  maxRows: 200
}

export const useAiStore = defineStore('ai', () => {
  const settings = ref<AiSettings>({ ...DEFAULT_SETTINGS })
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)

  const canSend = computed(() => {
    return Boolean(settings.value.model.trim()) && Boolean(settings.value.apiKey.trim())
  })

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<AiSettings>
      settings.value = { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
      // ignore
    }
  }

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  const resetChat = () => {
    messages.value = []
  }

  const pushUser = (content: string) => {
    messages.value.push({ id: nowId(), role: 'user', content })
  }

  const pushAssistant = (content: string, meta?: { sql?: string; rowCount?: number }) => {
    messages.value.push({
      id: nowId(),
      role: 'assistant',
      content,
      sql: meta?.sql,
      rowCount: meta?.rowCount
    })
  }

  return {
    settings,
    messages,
    loading,
    canSend,
    loadSettings,
    saveSettings,
    resetChat,
    pushUser,
    pushAssistant
  }
})

