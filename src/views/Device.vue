<template>
  <div class="device-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>设备分析</span>
        </div>
      </template>
      <div class="chart-container">
        <div ref="deviceChart" class="chart"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useDeviceStore } from '../stores/device'

const deviceStore = useDeviceStore()
const deviceChart = ref<HTMLElement | null>(null)

onMounted(() => {
  if (deviceChart.value) {
    const chart = echarts.init(deviceChart.value)
    // 这里添加图表配置
    chart.setOption({
      title: {
        text: '设备性能分析'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['设备1', '设备2', '设备3', '设备4', '设备5']
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
.device-container {
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