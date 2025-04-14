import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDeviceAnalysis } from '../api'

export const useDeviceStore = defineStore('device', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const deviceData = ref<any>(null)

  const fetchDeviceData = async (params: {
    startDate?: string
    endDate?: string
    deviceId?: string
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await getDeviceAnalysis(params)
      deviceData.value = response.data
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    deviceData,
    fetchDeviceData
  }
}) 