import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getGridAnalysis } from '../api'

export const useGridStore = defineStore('grid', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const gridData = ref<any>(null)

  const fetchGridData = async (params: {
    startDate?: string
    endDate?: string
    deviceId?: string
    operatorId?: string
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await getGridAnalysis(params)
      gridData.value = response.data
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    gridData,
    fetchGridData
  }
}) 