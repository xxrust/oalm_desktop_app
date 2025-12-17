<template>
  <div class="grid-container">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="修盘ID">
          <el-input-number
            v-model="filterForm.gridId"
            :min="1"
            :controls="false"
            placeholder="输入修盘ID定位"
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="设备ID">
          <el-select
            v-model="filterForm.deviceId"
            placeholder="选择设备"
            clearable
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="item in dataStore.deviceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="修盘方式(grid_mod)">
          <el-select
            v-model="filterForm.gridMod"
            placeholder="选择修盘方式"
            clearable
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="mod in gridStore.options.gridMods"
              :key="mod"
              :label="String(mod)"
              :value="mod"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>

        <el-form-item label="条数">
          <el-input-number v-model="filterForm.limit" :min="1" :max="1000" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="fetchGrid" :loading="gridStore.loading">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>修盘记录（grid 表）</span>
          <span class="count">共 {{ gridStore.records.length }} 条</span>
        </div>
      </template>

      <el-table
        :data="gridStore.records"
        style="width: 100%"
        border
        stripe
        highlight-current-row
        max-height="520"
        v-loading="gridStore.loading"
        @current-change="handleCurrentChange"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="ID" width="90" sortable />
        <el-table-column prop="device_id" label="设备" width="110" sortable />
        <el-table-column prop="grid_mod" label="grid_mod" width="100" sortable />
        <el-table-column prop="set_round" label="set_round" width="110" sortable />
        <el-table-column prop="start_time" label="开始时间" width="180" sortable>
          <template #default="scope">
            {{ formatDateTime(scope.row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="180" sortable>
          <template #default="scope">
            {{ formatDateTime(scope.row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration_seconds" label="时长(分钟)" width="110" sortable>
          <template #default="scope">
            {{ formatDurationMinute(scope.row.duration_seconds) }}
          </template>
        </el-table-column>
        <el-table-column prop="round_num" label="round_num" width="110" sortable />
        <el-table-column prop="end_way" label="end_way" width="100" sortable />
      </el-table>
    </el-card>

    <el-card class="analysis-card">
      <template #header>
        <div class="card-header">
          <span>修盘后质量变化（按盘数）</span>
          <el-button
            type="primary"
            size="small"
            :disabled="!canAnalyze"
            :loading="dataStore.loading"
            @click="analyzeRepairEffect"
          >
            分析
          </el-button>
        </div>
      </template>
      <div class="chart-container">
        <div ref="repairChartEl" class="chart"></div>
      </div>
      <div v-if="analysisHint" class="empty-hint">{{ analysisHint }}</div>
      <div v-if="analysisMetaText" class="meta-hint">{{ analysisMetaText }}</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useGridStore, type GridRecord } from '../stores/grid'
import { useDataStore } from '../stores'

const gridStore = useGridStore()
const dataStore = useDataStore()
const repairChartEl = ref<HTMLElement | null>(null)
let repairChart: echarts.ECharts | null = null
const resizeHandler = () => repairChart?.resize()

const filterForm = reactive({
  gridId: null as number | null,
  deviceId: '' as string,
  gridMod: null as number | null,
  dateRange: [] as string[],
  limit: 200
})

const selectedGrid = ref<GridRecord | null>(null)
const DEFAULT_MAX_BATCHES = 10

const canAnalyze = computed(() => selectedGrid.value !== null)

const analysisHint = computed(() => {
  if (!selectedGrid.value) return '请选择一条修盘记录后点击“分析”。'
  const data = dataStore.repairEffectData as any
  const rows = data?.batch_analysis
  if (dataStore.error) return String(dataStore.error)
  if (!rows) return ''
  if (Array.isArray(rows) && rows.length === 0) return '该修盘记录后未匹配到批次数据（可能修盘后无研磨/或很快进行了下一次修盘）。'
  return ''
})

const analysisMetaText = computed(() => {
  const data = dataStore.repairEffectData as any
  const meta = data?.meta
  const debug = data?.debug
  if (!meta && !debug) return ''

  const parts: string[] = []
  if (meta?.grid_time) parts.push(`修盘结束: ${formatDateTime(meta.grid_time)}`)
  if (meta?.next_grid_time) parts.push(`下一次修盘: ${formatDateTime(meta.next_grid_time)}`)
  if (debug?.candidate_batches !== undefined) parts.push(`匹配批次(<=10): ${debug.candidate_batches}`)
  return parts.join(' | ')
})

const fetchGrid = async () => {
  const [startDate, endDate] = filterForm.dateRange || []
  await gridStore.fetchGridRecords({
    gridId: filterForm.gridId ?? undefined,
    deviceId: filterForm.deviceId || undefined,
    gridMod: filterForm.gridMod ?? undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: filterForm.limit
  })
}

const resetFilter = async () => {
  filterForm.gridId = null
  filterForm.deviceId = ''
  filterForm.gridMod = null
  filterForm.dateRange = []
  filterForm.limit = 200
  await fetchGrid()
}

const analyzeRepairEffect = async () => {
  const grid = selectedGrid.value
  if (!grid) return

  await dataStore.fetchRepairEffect({
    gridId: grid.id,
    maxBatches: DEFAULT_MAX_BATCHES
  })
  await nextTick()
  renderRepairChart()
}

const handleCurrentChange = (currentRow: GridRecord | null) => {
  selectedGrid.value = currentRow
}

const handleRowClick = (row: GridRecord) => {
  selectedGrid.value = row
}

const formatDateTime = (value: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatDurationMinute = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return '-'
  const minutes = Number(seconds) / 60
  if (!Number.isFinite(minutes)) return '-'
  return minutes.toFixed(1)
}

const renderRepairChart = () => {
  if (!repairChartEl.value) return
  if (!repairChart) repairChart = echarts.init(repairChartEl.value)

  const payload: any = dataStore.repairEffectData
  const rows: any[] = payload?.batch_analysis || []

  const x = rows.map(r => r.batch_number)
  const avg = rows.map(r => r.avg_stdev)
  const std = rows.map(r => r.std_stdev)
  const count = rows.map(r => r.batch_count)

  repairChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均stdev', 'stdev波动', '批次数'] },
    grid: { left: 40, right: 30, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: x },
    yAxis: [
      { type: 'value', name: 'stdev' },
      { type: 'value', name: '批次数' }
    ],
    series: [
      { name: '平均stdev', type: 'line', data: avg, smooth: true },
      { name: 'stdev波动', type: 'line', data: std, smooth: true },
      { name: '批次数', type: 'bar', yAxisIndex: 1, data: count, barMaxWidth: 26, opacity: 0.7 }
    ]
  })
}

onMounted(() => {
  const init = async () => {
    if (dataStore.deviceOptions.length === 0) {
      await dataStore.fetchDevices()
    }
    await gridStore.fetchGridOptions()
    await fetchGrid()
    renderRepairChart()

    window.addEventListener('resize', resizeHandler)
  }

  init()
})

watch(
  () => dataStore.repairEffectData,
  () => {
    renderRepairChart()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  repairChart?.dispose()
  repairChart = null
})
</script>

<style scoped>
.grid-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.filter-card :deep(.el-form-item) {
  margin-bottom: 10px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.count {
  color: #606266;
  font-size: 12px;
}
.chart-container {
  height: 360px;
}
.chart {
  width: 100%;
  height: 100%;
}
.empty-hint {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}
.meta-hint {
  margin-top: 6px;
  color: #606266;
  font-size: 12px;
}
</style> 
