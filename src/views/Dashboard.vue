<template>
  <div class="dashboard">
    <!-- 复用批次分析页面的筛选控件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="批次ID">
          <el-select
            v-model="filterForm.batchIds"
            placeholder="输入或选择批次ID"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 250px;"
          >
            <el-option
              v-for="batchId in recentBatchIds"
              :key="batchId"
              :label="batchId"
              :value="batchId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备号">
          <el-select 
            v-model="filterForm.deviceIds" 
            placeholder="选择设备" 
            clearable 
            multiple 
            collapse-tags
            collapse-tags-tooltip
            style="width: 300px;"
          >
            <el-option
              v-for="item in dataStore.deviceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="员工号">
          <el-select 
            v-model="filterForm.operatorIds" 
            placeholder="选择员工" 
            clearable 
            multiple 
            collapse-tags
            collapse-tags-tooltip
            style="width: 300px;"
          >
            <el-option
              v-for="item in dataStore.operatorOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="频率范围">
          <el-input-number 
            v-model="filterForm.targetFMin" 
            :precision="1" 
            :step="0.5" 
            placeholder="最小频率"
            style="width: 130px;"
          />
          <span class="range-separator">-</span>
          <el-input-number 
            v-model="filterForm.targetFMax" 
            :precision="1" 
            :step="0.5" 
            placeholder="最大频率"
            style="width: 130px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter" :loading="dataStore.loading">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- olam表数据展示 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>批次数据列表</span>
          <div>
            <span class="update-time">最后更新: {{ lastUpdateTime }}</span>
            <el-button type="primary" size="small" @click="exportToExcel" style="margin-left: 10px; margin-right: 10px;">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
            <el-button type="primary" size="small" @click="fetchOlamData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </div>
      </template>
      <el-table 
        :data="olamTableData" 
        style="width: 100%" 
        border 
        stripe 
        max-height="500"
        v-loading="tableLoading"
      >
        <el-table-column prop="batch_id" label="批次ID" width="120" sortable />
        <el-table-column prop="device_id" label="设备号" width="100" sortable />
        <el-table-column prop="operator_id" label="员工号" width="100" sortable />
        <el-table-column prop="start_time" label="开始时间" width="150" sortable>
          <template #default="scope">
            {{ formatDateTime(scope.row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="150" sortable>
          <template #default="scope">
            {{ formatDateTime(scope.row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="start_f" label="起始频率" width="100" sortable>
          <template #default="scope">
            {{ scope.row.start_f?.toFixed(2) || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="target_f" label="目标频率" width="100" sortable>
          <template #default="scope">
            {{ scope.row.target_f?.toFixed(2) || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="final_f" label="最终频率" width="100" sortable>
          <template #default="scope">
            {{ scope.row.final_f?.toFixed(2) || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="stdev" label="标准差" width="100" sortable>
          <template #default="scope">
            {{ typeof scope.row.stdev === 'number' ? scope.row.stdev.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时(秒)" width="100" sortable>
          <template #default="scope">
            {{ getDuration(scope.row) }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalItems"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { Refresh, Download } from '@element-plus/icons-vue'
import { useDataStore } from '../stores'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const API_BASE_URL = 'http://127.0.0.1:5000/api'
const dataStore = useDataStore()
const olamTableData = ref<any[]>([])
const tableLoading = ref(false)
const lastUpdateTime = ref(new Date().toLocaleString())

// 分页控制
const currentPage = ref(1)
const pageSize = ref(20)
const totalItems = ref(0)

// 新增收集最近使用的批次ID
const recentBatchIds = ref<string[]>([])

// 筛选表单
const filterForm = reactive({
  batchIds: [] as string[],
  deviceIds: [] as string[],
  operatorIds: [] as string[],
  dateRange: getTodayDateRange(),
  targetFMin: null as number | null,
  targetFMax: null as number | null
})

// 更新最近使用的批次ID列表
const updateRecentBatchIds = (newBatchIds: string[]) => {
  // 合并新的批次ID和已有的，去重，并限制数量为10个
  const allBatchIds = [...new Set([...newBatchIds, ...recentBatchIds.value])]
  recentBatchIds.value = allBatchIds.slice(0, 10)
}

// 使用存储中的筛选条件初始化表单
const initializeFilterFromStore = () => {
  if (dataStore.currentFilter) {
    filterForm.batchIds = dataStore.currentFilter.batchIds || []
    filterForm.deviceIds = [...dataStore.currentFilter.deviceIds]
    filterForm.operatorIds = [...dataStore.currentFilter.operatorIds]
    filterForm.dateRange = [...dataStore.currentFilter.dateRange]
    filterForm.targetFMin = dataStore.currentFilter.targetFMin
    filterForm.targetFMax = dataStore.currentFilter.targetFMax
    
    // 如果有批次ID，添加到最近使用的列表中
    if (dataStore.currentFilter.batchIds && dataStore.currentFilter.batchIds.length > 0) {
      updateRecentBatchIds(dataStore.currentFilter.batchIds)
    }
  }
}

// 获取当天日期作为默认值
function getTodayDateRange() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const formattedDate = `${year}-${month}-${day}`
  return [formattedDate, formattedDate]
}

// 获取olam表数据
const fetchOlamData = async () => {
  try {
    tableLoading.value = true
    lastUpdateTime.value = new Date().toLocaleString()
    
    // 如果有新的批次ID，添加到最近使用的列表中
    if (filterForm.batchIds.length > 0) {
      updateRecentBatchIds(filterForm.batchIds)
    }
    
    // 准备API参数
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    // 添加过滤条件 - 批次ID优先级最高
    if (filterForm.batchIds && filterForm.batchIds.length > 0) {
      // 如果指定了批次ID，则仅使用批次ID作为筛选条件
      params.batchIds = filterForm.batchIds.join(',')
      
      // 此处可能需要一个特殊标记，告诉后端API这是按批次ID直接查询
      params.searchByBatchId = true
    } 
    else {
      // 只有在没有指定批次ID时，才应用其他筛选条件
      if (filterForm.deviceIds && filterForm.deviceIds.length > 0) {
        params.deviceIds = filterForm.deviceIds.join(',')
      }
      
      if (filterForm.operatorIds && filterForm.operatorIds.length > 0) {
        params.operatorIds = filterForm.operatorIds.join(',')
      }
      
      if (filterForm.dateRange[0]) params.startDate = filterForm.dateRange[0]
      if (filterForm.dateRange[1]) params.endDate = filterForm.dateRange[1]
      if (filterForm.targetFMin !== null) 
        params.targetFMin = filterForm.targetFMin.toString()
      if (filterForm.targetFMax !== null) 
        params.targetFMax = filterForm.targetFMax.toString()
    }
    
    // 保存当前筛选条件到store
    dataStore.saveCurrentFilter({
      batchIds: filterForm.batchIds,
      deviceIds: filterForm.deviceIds,
      operatorIds: filterForm.operatorIds,
      dateRange: filterForm.dateRange,
      targetFMin: filterForm.targetFMin,
      targetFMax: filterForm.targetFMax
    })
    
    // 发送API请求
    const response = await axios.get(`${API_BASE_URL}/olam`, { params })
    
    // 更新表格数据和分页信息
    olamTableData.value = response.data.items || []
    totalItems.value = response.data.total || 0
    
  } catch (error) {
    console.error('获取数据失败', error)
    ElMessage.error('获取数据失败')
  } finally {
    tableLoading.value = false
  }
}

onMounted(async () => {
  // 获取设备列表和操作员列表
  await Promise.all([
    dataStore.fetchDevices(),
    dataStore.fetchOperators()
  ])
  
  // 初始化筛选表单
  initializeFilterFromStore()
  
  // 获取初始数据
  await fetchOlamData()
})

// 重置筛选条件
const resetFilter = () => {
  filterForm.batchIds = []
  filterForm.deviceIds = []
  filterForm.operatorIds = []
  filterForm.dateRange = getTodayDateRange()
  filterForm.targetFMin = null
  filterForm.targetFMax = null
  fetchOlamData()
}

// 处理筛选
const handleFilter = async () => {
  currentPage.value = 1 // 重置到第一页
  await fetchOlamData()
}

// 处理页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchOlamData()
}

// 处理每页条数变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
  fetchOlamData()
}

// 时间格式化函数
function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '-'
  
  try {
    const date = new Date(dateStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${month}-${day} ${hours}:${minutes}`
  } catch (error) {
    return dateStr
  }
}

// 获取批次耗时（秒）
function getDuration(row: any) {
  if (!row.start_time || !row.end_time) return '-'
  return getDurationInSeconds(row)
}

function getDurationInSeconds(row: any) {
  const startTime = new Date(row.start_time).getTime()
  const endTime = new Date(row.end_time).getTime()
  return Math.round((endTime - startTime) / 1000)
}

// 导出Excel功能
const exportToExcel = async () => {
  try {
    // 显示加载状态
    tableLoading.value = true
    ElMessage.info('正在准备导出数据，请稍候...')
    
    // 构建查询参数 - 注意不包含分页参数，获取全部数据
    const searchParams = new URLSearchParams()
    
    // 批次ID优先级最高
    if (filterForm.batchIds && filterForm.batchIds.length > 0) {
      // 如果指定了批次ID，则仅使用批次ID作为筛选条件
      filterForm.batchIds.forEach(id => {
        searchParams.append('batchIds', id)
      })
      
      // 此处可能需要一个特殊标记，告诉后端API这是按批次ID直接查询
      searchParams.append('searchByBatchId', 'true')
    } 
    else {
      // 只有在没有指定批次ID时，才应用其他筛选条件
      if (filterForm.deviceIds && filterForm.deviceIds.length > 0) {
        filterForm.deviceIds.forEach(id => {
          searchParams.append('deviceIds', id)
        })
      }
      
      if (filterForm.operatorIds && filterForm.operatorIds.length > 0) {
        filterForm.operatorIds.forEach(id => {
          searchParams.append('operatorIds', id)
        })
      }
      
      if (filterForm.dateRange[0]) searchParams.append('startDate', filterForm.dateRange[0])
      if (filterForm.dateRange[1]) searchParams.append('endDate', filterForm.dateRange[1])
      if (filterForm.targetFMin !== null) 
        searchParams.append('targetFMin', filterForm.targetFMin.toString())
      if (filterForm.targetFMax !== null) 
        searchParams.append('targetFMax', filterForm.targetFMax.toString())
    }
    
    // 步骤1: 获取olam表数据
    const olamResponse = await axios.get(`${API_BASE_URL}/olam/export`, { params: searchParams })
    const olamData = olamResponse.data
    
    if (!olamData || olamData.length === 0) {
      ElMessage.warning('没有数据可供导出')
      tableLoading.value = false
      return
    }
    
    // 获取所有批次ID
    const batchIds = olamData.map(item => item.batch_id)
    
    // 步骤2: 获取last_round_f表数据
    const lastRoundFParams = new URLSearchParams()
    batchIds.forEach(id => {
      lastRoundFParams.append('batchIds', id)
    })
    
    const lastRoundFResponse = await axios.get(`${API_BASE_URL}/last_round_f/export`, 
      { params: lastRoundFParams })
    const lastRoundFData = lastRoundFResponse.data
    
    // 将last_round_f数据按批次ID分组
    const batchToFreData = {}
    lastRoundFData.forEach(item => {
      if (!batchToFreData[item.batch_id]) {
        batchToFreData[item.batch_id] = []
      }
      batchToFreData[item.batch_id].push(item.fre)
    })
    
    // 找出所有批次中最大的频率值数量，用于确定CSV的列数
    let maxFreCount = 0
    Object.values(batchToFreData as Record<string, any[]>).forEach((freList: any[]) => {
      maxFreCount = Math.max(maxFreCount, freList.length)
    })
    
    // 准备CSV表头
    const baseHeaders = ['批次ID', '设备号', '员工号', '开始时间', '结束时间', '起始频率', '目标频率', '最终频率', '标准差', '耗时(秒)']
    
    // 添加频率列
    const freHeaders = Array.from({ length: maxFreCount }, (_, i) => `频率${i+1}`)
    const headers = [...baseHeaders, ...freHeaders]
    
    // 准备CSV行数据
    const rows = [headers]
    
    // 合并数据
    olamData.forEach(item => {
      const freValues = batchToFreData[item.batch_id] || []
      
      // 基础数据
      const rowData = [
        item.batch_id,
        item.device_id,
        item.operator_id,
        formatDateTime(item.start_time),
        formatDateTime(item.end_time),
        item.start_f?.toFixed(2) || '-',
        item.target_f?.toFixed(2) || '-',
        item.final_f?.toFixed(2) || '-',
        typeof item.stdev === 'number' ? item.stdev.toFixed(2) : '-',
        getDurationInSeconds(item)
      ]
      
      // 添加频率值
      for (let i = 0; i < maxFreCount; i++) {
        if (i < freValues.length) {
          rowData.push(typeof freValues[i] === 'number' ? freValues[i].toFixed(2) : '-')
        } else {
          rowData.push('-') // 如果该批次的频率值少于最大数量，用'-'填充
        }
      }
      
      rows.push(rowData)
    })
    
    // 生成CSV内容
    let csvContent = rows.map(row => row.join(',')).join('\n')
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // 获取当前日期作为文件名
    const date = new Date()
    const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`
    const fileName = `批次数据_${dateStr}.csv`
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success(`成功导出 ${olamData.length} 条批次数据`)
    
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    tableLoading.value = false
  }
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.stat-row {
  margin-bottom: 20px;
}

.data-card {
  height: 150px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
}

.number {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
}

.label {
  font-size: 14px;
  color: #909399;
  margin-top: 10px;
}

.table-card {
  margin-bottom: 20px;
}

.update-time {
  margin-right: 10px;
  font-size: 14px;
  color: #909399;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.range-separator {
  margin: 0 5px;
}
</style> 