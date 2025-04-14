import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getOperatorAnalysis } from '../api'

export const useOperatorStore = defineStore('operator', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const operatorData = ref<any>(null)

  const fetchOperatorData = async (params: {
    startDate?: string
    endDate?: string
    operatorId?: string
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await getOperatorAnalysis(params)
      operatorData.value = response.data
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    operatorData,
    fetchOperatorData
  }
}) 