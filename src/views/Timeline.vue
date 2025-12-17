<template>
  <div class="timeline-container">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="日期">
          <el-date-picker v-model="filterForm.date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="设备">
          <el-select
            v-model="filterForm.deviceIds"
            placeholder="全部设备"
            clearable
            multiple
            collapse-tags
            collapse-tags-tooltip
            filterable
            style="width: 360px"
          >
            <el-option v-for="item in dataStore.deviceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchTimeline">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>设备 24h 状态时间轴（修盘/研磨/空闲）</span>
          <div class="legend">
            <span class="legend-item"><span class="dot repair" />修盘</span>
            <span class="legend-item"><span class="dot grind" />研磨</span>
            <span class="legend-item"><span class="dot idle" />空闲</span>
          </div>
        </div>
      </template>
      <div class="chart-container">
        <div ref="chartEl" class="chart"></div>
      </div>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>当日统计</span>
          <span class="total-hint" v-if="summaryText">{{ summaryText }}</span>
        </div>
      </template>
      <el-table :data="tableRows" border stripe max-height="360" v-loading="loading">
        <el-table-column prop="device_id" label="设备" width="110" sortable />
        <el-table-column prop="repair_h" label="修盘(小时)" width="120" sortable />
        <el-table-column prop="grind_h" label="研磨(小时)" width="120" sortable />
        <el-table-column prop="idle_h" label="空闲(小时)" width="120" sortable />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useDataStore } from '../stores'
import { getTimelineDay } from '../api'

type EventType = 'repair' | 'grind' | 'idle'

interface TimelineEvent {
  type: EventType
  start: string
  end: string
  source: Record<string, any>
}

interface DeviceTimeline {
  device_id: string
  totals_seconds: Record<EventType, number>
  events: TimelineEvent[]
}

const dataStore = useDataStore()
const loading = ref(false)
const chartEl = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
const resizeHandler = () => chart?.resize()

const filterForm = reactive({
  date: getToday(),
  deviceIds: [] as string[]
})

const responseData = ref<{ devices: DeviceTimeline[]; totals_seconds: Record<EventType, number>; window_start: string; window_end: string } | null>(
  null
)

function getToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const secondsToHours = (sec: number) => (sec / 3600).toFixed(2)

const tableRows = computed(() => {
  const devices = responseData.value?.devices || []
  return devices.map(d => ({
    device_id: d.device_id,
    repair_h: secondsToHours(d.totals_seconds.repair || 0),
    grind_h: secondsToHours(d.totals_seconds.grind || 0),
    idle_h: secondsToHours(d.totals_seconds.idle || 0)
  }))
})

const summaryText = computed(() => {
  const totals = responseData.value?.totals_seconds
  if (!totals) return ''
  return `修盘 ${secondsToHours(totals.repair || 0)}h | 研磨 ${secondsToHours(totals.grind || 0)}h | 空闲 ${secondsToHours(totals.idle || 0)}h`
})

const colorMap: Record<EventType, string> = {
  repair: '#E6A23C',
  grind: '#67C23A',
  idle: '#909399'
}

const fetchTimeline = async () => {
  if (!filterForm.date) {
    ElMessage.warning('请选择日期')
    return
  }
  loading.value = true
  try {
    const res = await getTimelineDay({
      date: filterForm.date,
      deviceIds: filterForm.deviceIds.length > 0 ? filterForm.deviceIds : undefined
    })
    responseData.value = res.data
    await nextTick()
    renderChart()
  } catch (e: any) {
    ElMessage.error(e?.message || '获取设备日程失败')
  } finally {
    loading.value = false
  }
}

const reset = async () => {
  filterForm.date = getToday()
  filterForm.deviceIds = []
  await fetchTimeline()
}

const renderChart = () => {
  if (!chartEl.value) return
  if (!chart) chart = echarts.init(chartEl.value)
  chart.clear()

  const devices = responseData.value?.devices || []
  const yLabels = devices.map(d => d.device_id)
  const windowStart = responseData.value?.window_start ? new Date(responseData.value.window_start).getTime() : undefined
  const windowEnd = responseData.value?.window_end ? new Date(responseData.value.window_end).getTime() : undefined

  const data: Array<{ value: [number, number, number, EventType]; name: string }> = []
  devices.forEach((d, idx) => {
    d.events.forEach(ev => {
      const s = new Date(ev.start).getTime()
      const t = new Date(ev.end).getTime()
      data.push({ value: [idx, s, t, ev.type], name: d.device_id })
    })
  })

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const v = p.value as any[]
        const type = v[3] as EventType
        const s = new Date(v[1]).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        const t = new Date(v[2]).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        return `${p.name}<br/>${type === 'repair' ? '修盘' : type === 'grind' ? '研磨' : '空闲'}<br/>${s} - ${t}`
      }
    },
    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'time',
      min: windowStart,
      max: windowEnd,
      axisLabel: {
        formatter: (val: any) =>
          new Date(val).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
    },
    yAxis: {
      type: 'category',
      data: yLabels
    },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const categoryIndex = api.value(0)
          const start = api.value(1)
          const end = api.value(2)
          const type = api.value(3) as EventType
          const startCoord = api.coord([start, categoryIndex])
          const endCoord = api.coord([end, categoryIndex])
          const barHeight = api.size([0, 1])[1] * 0.6
          return {
            type: 'rect',
            shape: echarts.graphic.clipRectByRect(
              {
                x: startCoord[0],
                y: startCoord[1] - barHeight / 2,
                width: endCoord[0] - startCoord[0],
                height: barHeight
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height
              }
            ),
            style: api.style({ fill: colorMap[type] })
          }
        },
        encode: { x: [1, 2], y: 0 },
        data
      }
    ]
  }

  chart.setOption(option, { notMerge: true })
}

onMounted(async () => {
  if (dataStore.deviceOptions.length === 0) {
    await dataStore.fetchDevices()
  }
  await fetchTimeline()
  window.addEventListener('resize', resizeHandler)
})

watch(
  () => responseData.value,
  () => {
    renderChart()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chart-container {
  height: 520px;
}
.chart {
  width: 100%;
  height: 100%;
}
.legend {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #606266;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.dot.repair {
  background: #e6a23c;
}
.dot.grind {
  background: #67c23a;
}
.dot.idle {
  background: #909399;
}
.total-hint {
  color: #606266;
  font-size: 12px;
}
</style>

