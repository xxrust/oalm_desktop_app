import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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
export const getGridAnalysis = (params: {
  gridId?: string
  date?: string
  startDate?: string
  endDate?: string
  deviceId?: string
  operatorId?: string
}) => api.get('/grid', { params })

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