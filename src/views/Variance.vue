<template>
  <div class="variance-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>方差分析</span>
        </div>
      </template>
      <div class="chart-container">
        <div ref="varianceChart" class="chart"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useVarianceStore } from '../stores/variance'

const varianceStore = useVarianceStore()
const varianceChart = ref<HTMLElement | null>(null)

onMounted(() => {
  if (varianceChart.value) {
    const chart = echarts.init(varianceChart.value)
    // 这里添加图表配置
    chart.setOption({
      title: {
        text: '方差趋势分析'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: [150, 230, 224, 218, 135, 147, 260],
          type: 'line'
        }
      ]
    })
  }
})
</script>

<style scoped>
.variance-container {
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