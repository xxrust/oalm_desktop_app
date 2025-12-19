<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { aiChat } from '../api'
import { useAiStore, type AiProviderId } from '../stores/ai'

const store = useAiStore()
const open = defineModel<boolean>({ default: false })

const input = ref('')
const messageListEl = ref<HTMLElement | null>(null)

const providerPresets: Array<{
  id: AiProviderId
  name: string
  baseUrl?: string
  models: string[]
}> = [
  {
    id: 'deepseek',
    name: 'DeepSeek（OpenAI兼容）',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o']
  },
  {
    id: 'qwen',
    name: '通义千问（OpenAI兼容）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max']
  },
  {
    id: 'custom',
    name: '自定义（OpenAI兼容）',
    models: []
  }
]

const selectedPreset = computed(() => providerPresets.find(p => p.id === store.settings.providerId))
const availableModels = computed(() => selectedPreset.value?.models ?? [])

watch(
  () => store.settings.providerId,
  providerId => {
    const preset = providerPresets.find(p => p.id === providerId)
    if (!preset) return
    if (providerId !== 'custom' && preset.baseUrl) store.settings.baseUrl = preset.baseUrl
    if (preset.models.length > 0 && !preset.models.includes(store.settings.model)) {
      store.settings.model = preset.models[0]
    }
    store.saveSettings()
  },
  { immediate: true }
)

watch(
  () => store.settings,
  () => store.saveSettings(),
  { deep: true }
)

const scrollToBottom = async () => {
  await nextTick()
  const el = messageListEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(
  () => store.messages.length,
  () => scrollToBottom()
)

const send = async () => {
  const text = input.value.trim()
  if (!text) return
  if (!store.canSend) {
    ElMessage.warning('请先选择模型并填写Key')
    return
  }

  store.pushUser(text)
  input.value = ''
  store.loading = true
  try {
    const history = store.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    const resp = await aiChat({
      providerId: store.settings.providerId,
      baseUrl: store.settings.providerId === 'custom' ? store.settings.baseUrl : undefined,
      model: store.settings.model,
      apiKey: store.settings.apiKey,
      message: text,
      history,
      maxRows: store.settings.maxRows
    })

    const data = resp.data as { reply: string; sql?: string; rowCount?: number }
    store.pushAssistant(data.reply ?? '', { sql: data.sql, rowCount: data.rowCount })
  } catch (e: any) {
    const err =
      e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '请求失败'
    ElMessage.error(err)
    store.pushAssistant(`请求失败：${err}`)
  } finally {
    store.loading = false
  }
}

const onEnter = (evt: KeyboardEvent) => {
  if (evt.key !== 'Enter') return
  if (evt.shiftKey) return
  evt.preventDefault()
  void send()
}

const clearChat = () => {
  store.resetChat()
}

const maskKey = computed(() => {
  const k = store.settings.apiKey.trim()
  if (!k) return ''
  if (k.length <= 10) return '*'.repeat(k.length)
  return `${k.slice(0, 4)}****${k.slice(-4)}`
})

onMounted(() => {
  store.loadSettings()
})
</script>

<template>
  <el-drawer v-model="open" title="AI 数据分析助手" direction="rtl" size="460px">
    <div class="wrap">
      <el-card class="settings" shadow="never">
        <template #header>
          <div class="settings-header">
            <span>模型配置</span>
            <el-tag type="info" effect="plain" class="key-hint">Key 本地保存（明文）</el-tag>
          </div>
        </template>

        <div class="settings-grid">
          <div class="label">提供方</div>
          <el-select v-model="store.settings.providerId" placeholder="选择提供方" style="width: 100%">
            <el-option v-for="p in providerPresets" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>

          <div class="label">API地址</div>
          <el-input
            v-model="store.settings.baseUrl"
            :disabled="store.settings.providerId !== 'custom'"
            placeholder="例如 https://api.example.com/v1"
          />

          <div class="label">模型</div>
          <el-select v-if="availableModels.length > 0" v-model="store.settings.model" style="width: 100%">
            <el-option v-for="m in availableModels" :key="m" :label="m" :value="m" />
          </el-select>
          <el-input v-else v-model="store.settings.model" placeholder="输入模型名，例如 gpt-4o-mini" />

          <div class="label">Key</div>
          <el-input v-model="store.settings.apiKey" type="password" show-password placeholder="请输入API Key" />

          <div class="label">行数上限</div>
          <el-input-number v-model="store.settings.maxRows" :min="10" :max="1000" :step="10" />
        </div>

        <div class="settings-footer">
          <span class="key-preview" v-if="maskKey">已填写：{{ maskKey }}</span>
          <span class="key-preview" v-else>未填写Key</span>
          <el-button size="small" @click="clearChat">清空对话</el-button>
        </div>
      </el-card>

      <div ref="messageListEl" class="messages">
        <div v-if="store.messages.length === 0" class="empty">你可以直接问：例如“最近一周各设备的批次数量是多少？”</div>
        <div v-for="m in store.messages" :key="m.id" class="msg" :class="m.role">
          <div class="bubble">
            <div class="role">{{ m.role === 'user' ? '我' : 'AI' }}</div>
            <div class="content">{{ m.content }}</div>
            <div v-if="m.sql" class="sql">
              <div class="sql-head">
                <span>SQL</span>
                <span v-if="typeof m.rowCount === 'number'" class="rows">返回 {{ m.rowCount }} 行</span>
              </div>
              <pre><code>{{ m.sql }}</code></pre>
            </div>
          </div>
        </div>
      </div>

      <div class="composer">
        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          placeholder="输入你的问题（Enter 发送，Shift+Enter 换行）"
          :disabled="store.loading"
          @keydown="onEnter"
        />
        <div class="actions">
          <el-button :disabled="store.loading || !input.trim()" @click="send">发送</el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.settings :deep(.el-card__body) {
  padding: 12px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.key-hint {
  white-space: nowrap;
}

.settings-grid {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px 12px;
  align-items: center;
}

.label {
  font-size: 12px;
  color: #606266;
}

.settings-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.key-preview {
  font-size: 12px;
  color: #909399;
}

.messages {
  flex: 1;
  overflow: auto;
  padding: 8px 2px;
}

.empty {
  color: #909399;
  font-size: 13px;
  padding: 14px 6px;
}

.msg {
  display: flex;
  margin: 10px 0;
}

.msg.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 92%;
  border-radius: 12px;
  padding: 10px 12px;
  background: #f5f7fa;
  color: #303133;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.msg.user .bubble {
  background: #ecf5ff;
}

.role {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.content {
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 14px;
}

.sql {
  margin-top: 10px;
  background: #111827;
  color: #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  overflow: auto;
}

.sql-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.rows {
  opacity: 0.9;
}

pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
