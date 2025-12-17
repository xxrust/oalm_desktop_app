import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getGridOptions, getGridRecords } from '../api'

export interface GridRecord {
  id: number
  device_id: string
  grid_mod: number | null
  set_round: number | null
  start_time: string | null
  end_time: string | null
  round_num: number | null
  end_way: number | null
  duration_seconds: number | null
}

export interface GridOptions {
  gridMods: number[]
  endWays: number[]
}

export const useGridStore = defineStore('grid', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const records = ref<GridRecord[]>([])
  const options = ref<GridOptions>({ gridMods: [], endWays: [] })

  const fetchGridRecords = async (params: {
    gridId?: number
    startDate?: string
    endDate?: string
    deviceId?: string
    gridMod?: number | string
    limit?: number
    offset?: number
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await getGridRecords(params)
      records.value = response.data || []
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  const fetchGridOptions = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await getGridOptions()
      options.value = response.data || { gridMods: [], endWays: [] }
    } catch (err: any) {
      error.value = err.message || '获取选项失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    records,
    options,
    fetchGridRecords,
    fetchGridOptions
  }
}) 
