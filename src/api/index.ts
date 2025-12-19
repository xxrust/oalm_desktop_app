import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
  timeout: 10000
})

// 数据概览相关接口
export const getDashboardData = () => api.get('/dashboard')
export const getVarianceTrend = () => api.get('/dashboard/variance-trend')
export const getDevicePerformance = () => api.get('/dashboard/device-performance')

// 偏差分析相关接口
export const getVarianceAnalysis = (params: {
  startDate?: string
  endDate?: string
  deviceId?: string
}) => api.get('/variance', { params })

// 网格分析相关接口
export const getGridRecords = (params: {
  gridId?: number
  deviceId?: string
  gridMod?: number | string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) => api.get('/grid', { params })

export const getGridOptions = () => api.get('/grid/options')

export const getTimelineDay = (params: { date: string; deviceIds?: string[] }) =>
  api.get('/timeline/day', { params })

// 设备分析相关接口
export const getDeviceAnalysis = (params: {
  deviceId?: string
  startDate?: string
  endDate?: string
}) => api.get('/device', { params })

// 操作员分析相关接口
export const getOperatorAnalysis = (params: {
  operatorId?: string
  startDate?: string
  endDate?: string
}) => api.get('/operator', { params }) 

export const aiChat = (payload: {
  providerId: string
  baseUrl?: string
  model: string
  apiKey: string
  message: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  maxRows?: number
}) => api.post('/ai/chat', payload, { timeout: 120000 })
