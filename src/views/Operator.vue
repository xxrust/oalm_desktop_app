<template>
  <div class="operator-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>操作员分析</span>
        </div>
      </template>
      <div class="chart-container">
        <div ref="operatorChart" class="chart"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useOperatorStore } from '../stores/operator'

const operatorStore = useOperatorStore()
const operatorChart = ref<HTMLElement | null>(null)

onMounted(() => {
  if (operatorChart.value) {
    const chart = echarts.init(operatorChart.value)
    // 这里添加图表配置
    chart.setOption({
      title: {
        text: '操作员绩效分析'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['操作员1', '操作员2', '操作员3', '操作员4', '操作员5']
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
.operator-container {
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