<template>
  <div class="batch-analysis">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="批次ID">
          <el-select
            v-model="filterForm.batchIds"
            placeholder="输入或选择批次ID"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 250px;"
          >
            <el-option
              v-for="batchId in recentBatchIds"
              :key="batchId"
              :label="batchId"
              :value="batchId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Lot号">
          <el-select
            v-model="filterForm.lotNumbers"
            placeholder="输入或选择Lot号"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 250px;"
          >
            <el-option
              v-for="lotNumber in recentLotNumbers"
              :key="lotNumber"
              :label="lotNumber"
              :value="lotNumber"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备号">
          <el-select 
            v-model="filterForm.deviceIds" 
            placeholder="选择设备" 
            clearable 
            multiple 
            collapse-tags
            collapse-tags-tooltip
            style="width: 200px;"
          >
            <el-option
              v-for="item in dataStore.deviceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="员工号">
          <el-select 
            v-model="filterForm.operatorIds" 
            placeholder="选择员工" 
            clearable 
            multiple 
            collapse-tags
            collapse-tags-tooltip
            style="width: 200px;"
          >
            <el-option
              v-for="item in dataStore.operatorOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
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
          />
        </el-form-item>
        <el-form-item label="频率范围">
          <el-input-number 
            v-model="filterForm.targetFMin" 
            :precision="1" 
            :step="0.5" 
            placeholder="最小频率"
            style="width: 130px;"
          />
          <span class="range-separator">-</span>
          <el-input-number 
            v-model="filterForm.targetFMax" 
            :precision="1" 
            :step="0.5" 
            placeholder="最大频率"
            style="width: 130px;"
          />
        </el-form-item>
        <el-form-item label="最大曲线数">
          <el-input-number
            v-model="filterForm.maxCurves"
            :min="1"
            :max="100"
            :step="1"
            placeholder="曲线数量"
            style="width: 130px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter" :loading="dataStore.loading">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="!hasBatchData" class="no-data">
      <el-empty description="暂无数据" />
    </div>

    <el-row v-else :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>圈数频率分析</span>
              <span class="data-count">共 {{ displayedBatchCount }} 批次数据</span>
            </div>
          </template>
          <div ref="frequencyRoundsChart" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>圈数标准差分析</span>
              <span class="data-count">共 {{ displayedBatchCount }} 批次数据</span>
            </div>
          </template>
          <div ref="stdevRoundsChart" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { useDataStore } from '../stores'
import type { EChartsOption } from 'echarts'
import { ElMessage } from 'element-plus'

const dataStore = useDataStore()
const frequencyRoundsChart = ref<HTMLElement | null>(null)
const stdevRoundsChart = ref<HTMLElement | null>(null)

// 新增收集最近使用的批次ID
const recentBatchIds = ref<string[]>([])
// 新增收集最近使用的Lot号
const recentLotNumbers = ref<string[]>([])

// 获取当天日期作为默认值
const getTodayDateRange = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const formattedDate = `${year}-${month}-${day}`
  return [formattedDate, formattedDate]
}

// 筛选表单，修改batchId为批次ID数组
const filterForm = reactive({
  batchIds: [] as string[],
  lotNumbers: [] as string[],
  deviceIds: [] as string[],
  operatorIds: [] as string[],
  dateRange: getTodayDateRange(),
  targetFMin: null as number | null,
  targetFMax: null as number | null,
  maxCurves: 10
})

// 使用存储中的筛选条件初始化表单，更新以支持批次ID数组
const initializeFilterFromStore = () => {
  if (dataStore.currentFilter) {
    filterForm.batchIds = dataStore.currentFilter.batchIds || []
    filterForm.lotNumbers = dataStore.currentFilter.lotNumbers || []
    filterForm.deviceIds = [...dataStore.currentFilter.deviceIds]
    filterForm.operatorIds = [...dataStore.currentFilter.operatorIds]
    filterForm.dateRange = [...dataStore.currentFilter.dateRange]
    filterForm.targetFMin = dataStore.currentFilter.targetFMin
    filterForm.targetFMax = dataStore.currentFilter.targetFMax
    filterForm.maxCurves = dataStore.currentFilter.maxCurves || 10
    
    // 如果有批次ID，添加到最近使用的列表中
    if (dataStore.currentFilter.batchIds && dataStore.currentFilter.batchIds.length > 0) {
      updateRecentBatchIds(dataStore.currentFilter.batchIds)
    }
    
    // 如果有Lot号，添加到最近使用的列表中
    if (dataStore.currentFilter.lotNumbers && dataStore.currentFilter.lotNumbers.length > 0) {
      updateRecentLotNumbers(dataStore.currentFilter.lotNumbers)
    }
  }
}

// 更新最近使用的批次ID列表
const updateRecentBatchIds = (newBatchIds: string[]) => {
  // 合并新的批次ID和已有的，去重，并限制数量为10个
  const allBatchIds = [...new Set([...newBatchIds, ...recentBatchIds.value])]
  recentBatchIds.value = allBatchIds.slice(0, 10)
}

// 更新最近使用的Lot号列表
const updateRecentLotNumbers = (newLotNumbers: string[]) => {
  // 合并新的Lot号和已有的，去重，并限制数量为10个
  const allLotNumbers = [...new Set([...newLotNumbers, ...recentLotNumbers.value])]
  recentLotNumbers.value = allLotNumbers.slice(0, 10)
}

// 计算是否有批次数据
const hasBatchData = computed(() => {
  return dataStore.batchData && dataStore.batchData.batchIds.length > 0
})

// 计算显示的批次数量
const displayedBatchCount = computed(() => {
  // 如果用户选择了指定批次ID，优先显示这些批次的数量
  if (filterForm.batchIds && filterForm.batchIds.length > 0) {
    return Math.min(filterForm.batchIds.length, filterForm.maxCurves || filterForm.batchIds.length)
  }
  
  // 否则显示API返回的批次数量，受最大曲线数量限制
  const totalBatches = dataStore.batchData?.batchIds.length || 0
  return Math.min(totalBatches, filterForm.maxCurves || totalBatches)
})

// 根据索引获取颜色
const getColor = (index: number) => {
  const colors = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', 
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#4ec06e'
  ]
  return colors[index % colors.length]
}

// 重置筛选条件，更新以清空批次ID数组
const resetFilter = () => {
  filterForm.batchIds = []
  filterForm.lotNumbers = []
  filterForm.deviceIds = []
  filterForm.operatorIds = []
  filterForm.dateRange = getTodayDateRange()
  filterForm.targetFMin = null
  filterForm.targetFMax = null
  filterForm.maxCurves = 10
  handleFilter()
}

// 初始化圈数频率和标准差图表
const initRoundsCharts = async () => {
  if (!frequencyRoundsChart.value || !stdevRoundsChart.value) return
  
  // 重要：优先使用用户选择的批次ID
  let batchIds: string[] = []
  
  // 如果用户指定了批次ID，则直接使用这些ID
  if (filterForm.batchIds && filterForm.batchIds.length > 0) {
    batchIds = [...filterForm.batchIds]
    console.log('使用用户指定的批次ID:', batchIds)
  } 
  // 否则从API返回的数据中获取批次ID
  else if (dataStore.batchData && dataStore.batchData.batchIds.length > 0) {
    batchIds = [...dataStore.batchData.batchIds]
    console.log('使用API返回的批次ID:', batchIds)
  }
  
  if (batchIds.length === 0) {
    // 如果没有批次ID，显示空图表
    if (frequencyRoundsChart.value && stdevRoundsChart.value) {
      echarts.dispose(frequencyRoundsChart.value)
      echarts.dispose(stdevRoundsChart.value)
      
      // 重新初始化空图表
      const frequencyRoundsChartInstance = echarts.init(frequencyRoundsChart.value)
      const stdevRoundsChartInstance = echarts.init(stdevRoundsChart.value)
      
      // 显示无数据的提示
      frequencyRoundsChartInstance.setOption({
        title: { text: '圈数频率分析（无数据）' }
      })
      
      stdevRoundsChartInstance.setOption({
        title: { text: '圈数标准差分析（无数据）' }
      })
    }
    return
  }
  
  // 应用最大曲线数量的限制
  if (filterForm.maxCurves && batchIds.length > filterForm.maxCurves) {
    batchIds = batchIds.slice(0, filterForm.maxCurves)
    console.log('应用最大曲线数量限制后的批次ID:', batchIds)
  }
  
  // 获取当前图表实例
  let frequencyRoundsChartInstance = echarts.getInstanceByDom(frequencyRoundsChart.value)
  let stdevRoundsChartInstance = echarts.getInstanceByDom(stdevRoundsChart.value)
  
  // 如果实例不存在，创建新实例
  if (!frequencyRoundsChartInstance || !stdevRoundsChartInstance) {
    if (frequencyRoundsChartInstance) echarts.dispose(frequencyRoundsChartInstance)
    if (stdevRoundsChartInstance) echarts.dispose(stdevRoundsChartInstance)
    
    frequencyRoundsChartInstance = echarts.init(frequencyRoundsChart.value)
    stdevRoundsChartInstance = echarts.init(stdevRoundsChart.value)
  }
  
  // 获取当前显示的批次ID
  const currentOption = frequencyRoundsChartInstance.getOption()
  const currentFrequencyBatchIds = ((currentOption?.series as any[]) || [])
    .map(s => typeof s.name === 'string' ? s.name.replace('批次 ', '') : '')
    .filter(Boolean)
  
  // 计算需要添加和删除的批次
  const batchesToAdd = batchIds.filter(id => !currentFrequencyBatchIds.includes(id))
  const batchesToRemove = currentFrequencyBatchIds.filter(id => !batchIds.includes(id))
  
  console.log('需要添加的批次:', batchesToAdd)
  console.log('需要删除的批次:', batchesToRemove)
  
  // 如果有需要添加的批次，获取它们的数据
  if (batchesToAdd.length > 0) {
    await dataStore.fetchBatchRounds(batchesToAdd)
  }
  
  // 准备新的频率数据系列
  const frequencySeries = batchIds.map((batchId, index) => {
    const batchData = dataStore.batchRoundsData[batchId] || []
    return {
      name: `批次 ${batchId}`,
      type: 'line' as const,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: batchData.map(item => [item.count, item.resonant]),
      itemStyle: {
        color: getColor(index)
      }
    }
  })
  
  // 准备新的标准差数据系列
  const stdevSeries = batchIds.map((batchId, index) => {
    const batchData = dataStore.batchRoundsData[batchId] || []
    return {
      name: `批次 ${batchId}`,
      type: 'line' as const,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: batchData.map(item => [item.count, item.stdev]),
      itemStyle: {
        color: getColor(index)
      }
    }
  })
  
  // 获取所有圈数，用于设置x轴
  const allCounts = batchIds.reduce((counts, batchId) => {
    const batchData = dataStore.batchRoundsData[batchId] || []
    batchData.forEach(item => {
      if (!counts.includes(item.count)) {
        counts.push(item.count)
      }
    })
    return counts
  }, [] as number[])
  
  // 对圈数进行排序
  allCounts.sort((a, b) => a - b)
  
  // 更新频率图表配置
  const frequencyRoundsOption: EChartsOption = {
    title: {
      text: '圈数频率分析'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const result = [`圈数: ${params[0].value[0]}`]
        params.forEach((param: any) => {
          result.push(`${param.seriesName}: ${param.value[1].toFixed(2)} Hz`)
        })
        return result.join('<br/>')
      }
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: 30,
      data: batchIds.map(id => `批次 ${id}`)
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
      top: 80
    },
    xAxis: {
      type: 'value',
      name: '圈数',
      nameLocation: 'middle',
      nameGap: 30,
      min: allCounts.length > 0 ? Math.min(...allCounts) : 0,
      max: allCounts.length > 0 ? Math.max(...allCounts) : 100,
      splitLine: {
        show: true
      }
    },
    yAxis: {
      type: 'value',
      name: '频率(Hz)',
      nameLocation: 'middle',
      nameGap: 50,
      scale: true
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none'
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none'
      }
    ],
    series: frequencySeries
  }
  
  // 更新标准差图表配置
  const stdevRoundsOption: EChartsOption = {
    title: {
      text: '圈数标准差分析'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const result = [`圈数: ${params[0].value[0]}`]
        params.forEach((param: any) => {
          result.push(`${param.seriesName}: ${param.value[1].toFixed(2)}`)
        })
        return result.join('<br/>')
      }
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: 30,
      data: batchIds.map(id => `批次 ${id}`)
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
      top: 80
    },
    xAxis: {
      type: 'value',
      name: '圈数',
      nameLocation: 'middle',
      nameGap: 30,
      min: allCounts.length > 0 ? Math.min(...allCounts) : 0,
      max: allCounts.length > 0 ? Math.max(...allCounts) : 100,
      splitLine: {
        show: true
      }
    },
    yAxis: {
      type: 'value',
      name: '标准差',
      nameLocation: 'middle',
      nameGap: 50,
      scale: true
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none'
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none'
      }
    ],
    series: stdevSeries
  }
  
  // 使用setOption的notMerge: false选项来保持动画效果
  frequencyRoundsChartInstance.setOption(frequencyRoundsOption, { notMerge: true })
  stdevRoundsChartInstance.setOption(stdevRoundsOption, { notMerge: true })
  
  // 添加窗口大小变化时的图表调整
  window.addEventListener('resize', () => {
    frequencyRoundsChartInstance?.resize()
    stdevRoundsChartInstance?.resize()
  })
}

// 处理筛选
const handleFilter = async () => {
  // 如果有新的批次ID，添加到最近使用的列表中
  if (filterForm.batchIds.length > 0) {
    updateRecentBatchIds(filterForm.batchIds)
  }
  
  // 如果有新的Lot号，添加到最近使用的列表中
  if (filterForm.lotNumbers.length > 0) {
    updateRecentLotNumbers(filterForm.lotNumbers)
  }
  
  const params = {
    batchIds: filterForm.batchIds,
    lotNumbers: filterForm.lotNumbers,
    deviceIds: filterForm.deviceIds,
    operatorIds: filterForm.operatorIds,
    startDate: filterForm.dateRange[0],
    endDate: filterForm.dateRange[1],
    targetFMin: filterForm.targetFMin,
    targetFMax: filterForm.targetFMax,
    limit: filterForm.maxCurves
  }
  
  // 如果是通过批次ID筛选，直接初始化图表
  if (filterForm.batchIds.length > 0) {
    // 仍然需要调用fetchBatchData来保存筛选条件，但图表将直接使用批次ID
    await dataStore.fetchBatchData(params)
  } 
  // 如果是通过Lot号筛选
  else if (filterForm.lotNumbers.length > 0) {
    // 通过Lot号获取对应的批次数据
    await dataStore.fetchBatchData(params)
  }
  else {
    // 如果没有指定批次ID和Lot号，则通过其他条件进行筛选
    await dataStore.fetchBatchData(params)
  }
  
  // 无论如何，都初始化图表
  initRoundsCharts()
}

// 监听数据变化
watch(() => dataStore.batchData, (newVal, oldVal) => {
  // 无论数据增加还是减少，都完全重新初始化图表
  initRoundsCharts()
}, { deep: true })

// 监听最大曲线数量的变化
watch(() => filterForm.maxCurves, (newVal) => {
  // 当最大曲线数量变化时，重新初始化图表以应用新的限制
  if (dataStore.batchData && dataStore.batchData.batchIds.length > 0) {
    initRoundsCharts()
  }
})

onMounted(async () => {
  // 获取设备列表和操作员列表
  await Promise.all([
    dataStore.fetchDevices(),
    dataStore.fetchOperators()
  ])
  
  // 如果页面之前已经加载过数据，重新使用之前的筛选条件
  initializeFilterFromStore()
  if (dataStore.dataLoaded) {
    // 如果数据已经加载过，直接初始化图表
    initRoundsCharts()
  } else {
    // 否则重新加载数据
    await dataStore.reloadLastData()
  }
})
</script>

<style scoped>
.batch-analysis {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}

.chart {
  height: 400px;
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.range-separator {
  margin: 0 5px;
}

.data-count {
  font-size: 14px;
  color: #909399;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}
</style> 