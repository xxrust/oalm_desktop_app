import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getVarianceAnalysis } from '../api'

export const useVarianceStore = defineStore('variance', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const varianceData = ref<any>(null)

  const fetchVarianceData = async (params: {
    startDate?: string
    endDate?: string
    deviceId?: string
    operatorId?: string
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await getVarianceAnalysis(params)
      varianceData.value = response.data
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    varianceData,
    fetchVarianceData
  }
}) 