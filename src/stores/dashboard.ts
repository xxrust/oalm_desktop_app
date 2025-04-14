import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getDashboardData,
  getVarianceTrend,
  getDevicePerformance
} from '../api'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const dashboardData = ref<any>(null)
  const varianceTrend = ref<any>(null)
  const devicePerformance = ref<any>(null)

  const fetchDashboardData = async () => {
    try {
      loading.value = true
      error.value = null
      const [data, trend, performance] = await Promise.all([
        getDashboardData(),
        getVarianceTrend(),
        getDevicePerformance()
      ])
      dashboardData.value = data.data
      varianceTrend.value = trend.data
      devicePerformance.value = performance.data
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    dashboardData,
    varianceTrend,
    devicePerformance,
    fetchDashboardData
  }
}) 