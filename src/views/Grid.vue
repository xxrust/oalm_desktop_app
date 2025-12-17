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
        ref="gridTableRef"
        :data="gridStore.records"
        style="width: 100%"
        border
        stripe
        max-height="520"
        v-loading="gridStore.loading"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
      >
        <el-table-column type="selection" width="50" />
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
          <div class="analysis-actions">
            <el-button size="small" @click="selectAllFiltered" :disabled="gridStore.records.length === 0">全选</el-button>
            <el-button size="small" @click="clearSelection" :disabled="selectedGrids.length === 0">清空</el-button>
            <el-select v-model="groupBy" size="small" style="width: 160px">
              <el-option label="全部合并" value="all" />
              <el-option label="按设备合并" value="device" />
              <el-option label="不合并(每次修盘一条线)" value="grid" />
            </el-select>
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
import type { ElTable } from 'element-plus'

const gridStore = useGridStore()
const dataStore = useDataStore()
const gridTableRef = ref<InstanceType<typeof ElTable> | null>(null)
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

const selectedGrids = ref<GridRecord[]>([])
const DEFAULT_MAX_BATCHES = 10
const groupBy = ref<'all' | 'device' | 'grid'>('all')

const canAnalyze = computed(() => selectedGrids.value.length > 0)

const analysisHint = computed(() => {
  if (selectedGrids.value.length === 0) return '请选择一个或多个修盘记录后点击“分析”。'
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
  if (data?.groupBy) parts.push(`模式: ${String(data.groupBy)}`)

  if (meta?.grid_time) parts.push(`修盘结束: ${formatDateTime(meta.grid_time)}`)
  if (meta?.next_grid_time) parts.push(`下一次修盘: ${formatDateTime(meta.next_grid_time)}`)
  if (debug?.candidate_batches !== undefined) parts.push(`匹配批次(<=10): ${debug.candidate_batches}`)
  if (debug?.selected_grids !== undefined) parts.push(`选中修盘: ${debug.selected_grids}`)
  if (debug?.grids_with_candidates !== undefined) parts.push(`有批次修盘: ${debug.grids_with_candidates}`)

  // quick series count hint for multi-line modes
  const rows: any[] = data?.batch_analysis || []
  if (data?.groupBy === 'grid') {
    const unique = new Set(rows.map(r => r.grid_id))
    parts.push(`线条: ${unique.size}`)
  } else if (data?.groupBy === 'device') {
    const unique = new Set(rows.map(r => r.device_id))
    parts.push(`线条: ${unique.size}`)
  } else if (data?.groupBy === 'all') {
    parts.push('线条: 1')
  }
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
  if (selectedGrids.value.length === 0) return

  await dataStore.fetchRepairEffect({
    gridIds: selectedGrids.value.map(r => r.id),
    maxBatches: DEFAULT_MAX_BATCHES,
    groupBy: groupBy.value
  } as any)
  await nextTick()
  renderRepairChart()
}

const handleSelectionChange = (rows: GridRecord[]) => {
  selectedGrids.value = rows
}

const handleRowClick = (row: GridRecord) => {
  gridTableRef.value?.toggleRowSelection(row)
}

const selectAllFiltered = () => {
  gridTableRef.value?.toggleAllSelection()
}

const clearSelection = () => {
  gridTableRef.value?.clearSelection()
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

  const x = Array.from({ length: DEFAULT_MAX_BATCHES }, (_, i) => i + 1)

  const mode = payload?.groupBy || groupBy.value

  const buildSeries = () => {
    if (mode === 'grid') {
      const byGrid = new Map<number, { deviceId?: string; points: Map<number, number | null> }>()
      rows.forEach(r => {
        const gridId = Number(r.grid_id)
        const deviceId = r.device_id ? String(r.device_id) : undefined
        const batchNumber = Number(r.batch_number)
        const stdev = r.stdev === null || r.stdev === undefined ? null : Number(r.stdev)
        if (!byGrid.has(gridId)) byGrid.set(gridId, { deviceId, points: new Map() })
        byGrid.get(gridId)!.points.set(batchNumber, stdev)
      })

      return Array.from(byGrid.entries()).map(([gridId, v]) => ({
        name: v.deviceId ? `${v.deviceId}#${gridId}` : String(gridId),
        type: 'line',
        smooth: true,
        data: x.map(n => (v.points.has(n) ? v.points.get(n) : null))
      }))
    }

    if (mode === 'device') {
      const byDevice = new Map<string, Map<number, number | null>>()
      rows.forEach(r => {
        const deviceId = String(r.device_id)
        const batchNumber = Number(r.batch_number)
        const avgStdev = r.avg_stdev === null || r.avg_stdev === undefined ? null : Number(r.avg_stdev)
        if (!byDevice.has(deviceId)) byDevice.set(deviceId, new Map())
        byDevice.get(deviceId)!.set(batchNumber, avgStdev)
      })

      return Array.from(byDevice.entries()).map(([deviceId, points]) => ({
        name: deviceId,
        type: 'line',
        smooth: true,
        data: x.map(n => (points.has(n) ? points.get(n) : null))
      }))
    }

    // all
    const points = new Map<number, number | null>()
    rows.forEach(r => {
      const batchNumber = Number(r.batch_number)
      const avgStdev = r.avg_stdev === null || r.avg_stdev === undefined ? null : Number(r.avg_stdev)
      points.set(batchNumber, avgStdev)
    })

    return [
      {
        name: 'stdev',
        type: 'line',
        smooth: true,
        data: x.map(n => (points.has(n) ? points.get(n) : null))
      }
    ]
  }

  const series = buildSeries()

  repairChart.clear()
  repairChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: series.map(s => s.name) },
    grid: { left: 40, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: x },
    yAxis: [{ type: 'value', name: 'stdev' }],
    series
  }, { notMerge: true })
}

const clearAnalysis = () => {
  repairChart?.clear()
  ;(dataStore as any).repairEffectData = null
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

watch(
  () => groupBy.value,
  () => {
    clearAnalysis()
  }
)

watch(
  () => selectedGrids.value.map(r => r.id).join(','),
  () => {
    clearAnalysis()
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
.analysis-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style> 
