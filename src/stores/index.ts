import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

// API 基础URL
const API_BASE_URL = 'http://127.0.0.1:5000/api'

// 筛选条件类型
interface FilterType {
  batchIds?: string[]
  lotNumbers?: string[]
  deviceIds: string[]
  operatorIds: string[]
  dateRange: string[]
  targetFMin: number | null
  targetFMax: number | null
  maxCurves?: number
}

export const useDataStore = defineStore('data', () => {
  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 数据
  const batchData = ref<{
    batchIds: string[]
    frequencies: number[]
    stdevs: number[]
    timestamps: string[]
  } | null>(null)
  
  const deviceOptions = ref<Array<{ value: string; label: string }>>([])
  const operatorOptions = ref<Array<{ value: string; label: string }>>([])
  const totalBatches = ref<number>(0)

  // 分析数据
  const initialVarianceData = ref<any>(null)
  const repairEffectData = ref<any>(null)
  const frequencyRangeData = ref<any>(null)
  const operatorDeviceImpactData = ref<any>(null)

  // 批次圈数频率数据
  const batchRoundsData = ref<Record<string, Array<{
    count: number
    resonant: number
    stdev: number
    time: string
  }>>>({})

  // 保存当前筛选参数
  const currentFilter = ref<FilterType | null>(null)
  
  // 保存当前筛选条件的方法
  const saveCurrentFilter = (filter: FilterType) => {
    currentFilter.value = filter
  }

  // 标记数据是否已加载
  const dataLoaded = ref(false)

  // 获取总批次数量
  const fetchTotalBatches = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/batches/count`)
      totalBatches.value = response.data.count
    } catch (err: any) {
      error.value = err.message || '获取总批次数量失败'
      console.error('获取总批次数量失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取设备列表
  const fetchDevices = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/devices`)
      deviceOptions.value = response.data.map((device: any) => ({
        value: device.device_id,
        label: device.device_name
      }))
    } catch (err: any) {
      error.value = err.message || '获取设备列表失败'
      console.error('获取设备列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取操作员列表
  const fetchOperators = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/operators`)
      operatorOptions.value = response.data.map((operator: any) => ({
        value: operator.operator_id,
        label: operator.operator_name
      }))
    } catch (err: any) {
      error.value = err.message || '获取操作员列表失败'
      console.error('获取操作员列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取批次数据
  const fetchBatchData = async (params: {
    batchIds?: string[]
    lotNumbers?: string[]
    deviceIds?: string[]
    operatorIds?: string[]
    startDate?: string
    endDate?: string
    targetFMin?: number | null
    targetFMax?: number | null
    limit?: number
  }) => {
    try {
      loading.value = true
      
      // 保存当前筛选条件
      saveCurrentFilter({
        batchIds: params.batchIds,
        lotNumbers: params.lotNumbers,
        deviceIds: params.deviceIds || [],
        operatorIds: params.operatorIds || [],
        dateRange: [params.startDate || '', params.endDate || ''],
        targetFMin: params.targetFMin ?? null,
        targetFMax: params.targetFMax ?? null,
        maxCurves: params.limit
      })
      
      // 构建查询参数
      const searchParams = new URLSearchParams()
      
      // 添加批次ID数组 - 如果有批次ID，其他筛选条件忽略
      if (params.batchIds && params.batchIds.length > 0) {
        params.batchIds.forEach(id => {
          searchParams.append('batchIds', id)
        })
        
        // 设置限制数量
        if (params.limit) {
          searchParams.append('limit', params.limit.toString())
        }
      } 
      // 添加Lot号数组 - 如果有Lot号，其他筛选条件忽略（批次ID除外）
      else if (params.lotNumbers && params.lotNumbers.length > 0) {
        params.lotNumbers.forEach(lotNumber => {
          searchParams.append('lotNumbers', lotNumber)
        })
        
        // 设置限制数量
        if (params.limit) {
          searchParams.append('limit', params.limit.toString())
        }
      }
      // 只有在没有指定批次ID和Lot号时，才应用其他筛选条件
      else {
        // 处理设备ID数组
        if (params.deviceIds && params.deviceIds.length > 0) {
          params.deviceIds.forEach(id => {
            searchParams.append('deviceIds', id)
          })
        }
        
        // 处理操作员ID数组
        if (params.operatorIds && params.operatorIds.length > 0) {
          params.operatorIds.forEach(id => {
            searchParams.append('operatorIds', id)
          })
        }
        
        // 添加其他参数
        if (params.startDate) searchParams.append('startDate', params.startDate)
        if (params.endDate) searchParams.append('endDate', params.endDate)
        if (params.targetFMin !== null && params.targetFMin !== undefined) 
          searchParams.append('targetFMin', params.targetFMin.toString())
        if (params.targetFMax !== null && params.targetFMax !== undefined) 
          searchParams.append('targetFMax', params.targetFMax.toString())
        
        // 设置限制数量
        if (params.limit) {
          searchParams.append('limit', params.limit.toString())
        }
      }
      
      const response = await axios.get(`${API_BASE_URL}/batches`, { params: searchParams })
      
      // 处理返回的数据
      const batches = response.data
      
      // 如果没有数据，初始化空数组
      if (!batches || batches.length === 0) {
        batchData.value = {
          batchIds: [],
          frequencies: [],
          stdevs: [],
          timestamps: []
        }
        return
      }
      
      // 确定要使用的频率字段 (final_f, target_f 或 start_f)
      const frequencyField = batches[0].final_f !== undefined ? 'final_f' : 
                             batches[0].target_f !== undefined ? 'target_f' : 'start_f'
      
      batchData.value = {
        batchIds: batches.map((batch: any) => batch.batch_id),
        frequencies: batches.map((batch: any) => batch[frequencyField]),
        stdevs: batches.map((batch: any) => batch.stdev || 0),
        timestamps: batches.map((batch: any) => {
          // 确定要使用的时间字段 (end_time 或 start_time)
          const timeField = batch.end_time !== undefined ? 'end_time' : 'start_time'
          // 格式化日期时间
          const date = new Date(batch[timeField])
          return date.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      }

      // 数据已加载标志设为true
      dataLoaded.value = true
    } catch (err: any) {
      error.value = err.message || '获取批次数据失败'
      console.error('获取批次数据失败:', err)
      // 初始化空数据，防止页面报错
      batchData.value = {
        batchIds: [],
        frequencies: [],
        stdevs: [],
        timestamps: []
      }
    } finally {
      loading.value = false
    }
  }

  // 重新加载上次的数据（用于页面重新进入时）
  const reloadLastData = async () => {
    if (!dataLoaded.value) {
      await fetchBatchData({
        batchIds: currentFilter.value?.batchIds,
        lotNumbers: currentFilter.value?.lotNumbers,
        deviceIds: currentFilter.value?.deviceIds || [],
        operatorIds: currentFilter.value?.operatorIds || [],
        startDate: currentFilter.value?.dateRange[0] || '',
        endDate: currentFilter.value?.dateRange[1] || '',
        targetFMin: currentFilter.value?.targetFMin ?? null,
        targetFMax: currentFilter.value?.targetFMax ?? null,
        limit: currentFilter.value?.maxCurves
      })

      // 如果有批次数据，加载圈数数据
      if (batchData.value && batchData.value.batchIds.length > 0) {
        await fetchBatchRounds(batchData.value.batchIds)
      }
    }
  }

  // 分析初始散差
  const fetchInitialVariance = async (batchId: string, roundCount: number = 3) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/analysis/initial-variance`, {
        params: { batchId, roundCount }
      })
      initialVarianceData.value = response.data
    } catch (err: any) {
      error.value = err.message || '分析初始散差失败'
      console.error('分析初始散差失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 分析修盘效果
  const fetchRepairEffect = async (deviceId: string, repairMethod: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/analysis/repair-effect`, {
        params: { deviceId, repairMethod }
      })
      repairEffectData.value = response.data
    } catch (err: any) {
      error.value = err.message || '分析修盘效果失败'
      console.error('分析修盘效果失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 按频率范围分析散差
  const fetchFrequencyRangeAnalysis = async (deviceId: string, frequencyRanges: Array<{min: number, max: number}>) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/analysis/frequency-range`, {
        deviceId,
        frequencyRanges
      })
      frequencyRangeData.value = response.data
    } catch (err: any) {
      error.value = err.message || '按频率范围分析散差失败'
      console.error('按频率范围分析散差失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 分析操作员和设备对散差的影响
  const fetchOperatorDeviceImpact = async (startDate: string, endDate: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/analysis/operator-device-impact`, {
        params: { startDate, endDate }
      })
      operatorDeviceImpactData.value = response.data
    } catch (err: any) {
      error.value = err.message || '分析操作员和设备影响失败'
      console.error('分析操作员和设备影响失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取批次圈数数据
  const fetchBatchRounds = async (batchIds: string[]) => {
    try {
      loading.value = true
      error.value = null
      
      // 如果没有批次ID，返回空数据
      if (!batchIds || batchIds.length === 0) {
        batchRoundsData.value = {}
        return
      }
      
      console.log('开始获取批次圈数数据，批次ID:', batchIds)
      
      // 构建查询参数：多个batchIds需要重复参数名
      const params = new URLSearchParams()
      batchIds.forEach(id => {
        params.append('batchIds', id)
      })
      
      // 发送单个请求获取所有批次数据
      const response = await axios.get(`${API_BASE_URL}/batches/rounds`, { params })
      
      // 合并新数据和已有数据，而不是直接覆盖
      batchRoundsData.value = {
        ...batchRoundsData.value,
        ...response.data
      }
      
      console.log('获取到的批次数据:', JSON.stringify(batchRoundsData.value))
      
    } catch (err: any) {
      error.value = err.message || '获取批次圈数数据失败'
      console.error('获取批次圈数数据失败:', err)
      batchRoundsData.value = {}
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    batchData,
    deviceOptions,
    operatorOptions,
    totalBatches,
    initialVarianceData,
    repairEffectData,
    frequencyRangeData,
    operatorDeviceImpactData,
    batchRoundsData,
    currentFilter,
    saveCurrentFilter,
    dataLoaded,
    fetchBatchData,
    fetchDevices,
    fetchOperators,
    fetchTotalBatches,
    fetchInitialVariance,
    fetchRepairEffect,
    fetchFrequencyRangeAnalysis,
    fetchOperatorDeviceImpact,
    fetchBatchRounds,
    reloadLastData
  }
}) 