<template>
  <div class="grid-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>网格分析</span>
        </div>
      </template>
      <div class="chart-container">
        <div ref="gridChart" class="chart"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useGridStore } from '../stores/grid'

const gridStore = useGridStore()
const gridChart = ref<HTMLElement | null>(null)

onMounted(() => {
  if (gridChart.value) {
    const chart = echarts.init(gridChart.value)
    // 这里添加图表配置
    chart.setOption({
      title: {
        text: '网格性能分析'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['网格1', '网格2', '网格3', '网格4', '网格5']
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: [120, 200, 150, 80, 70],
          type: 'bar'
        }
      ]
    })
  }
})
</script>

<style scoped>
.grid-container {
  padding: 20px;
}
.chart-container {
  height: 400px;
}
.chart {
  width: 100%;
  height: 100%;
}
</style> 