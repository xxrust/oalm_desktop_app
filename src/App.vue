<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataLine,
  Grid,
  Histogram
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const activeMenu = computed(() => route.path)

const handleSelect = (index: string) => {
  router.push(index)
}
</script>

<template>
  <el-container class="app-container">
    <el-aside width="200px">
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        @select="handleSelect"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>数据概览</span>
        </el-menu-item>
        <el-menu-item index="/grid">
          <el-icon><Grid /></el-icon>
          <span>修盘数据</span>
        </el-menu-item>
        <!-- <el-menu-item index="/variance">
          <el-icon><TrendCharts /></el-icon>
          <span>偏差分析</span>
        </el-menu-item>
        <el-menu-item index="/device">
          <el-icon><Monitor /></el-icon>
          <span>设备分析</span>
        </el-menu-item>
        <el-menu-item index="/operator">
          <el-icon><User /></el-icon>
          <span>操作员分析</span>
        </el-menu-item> -->
        <el-menu-item index="/batch">
          <el-icon><Histogram /></el-icon>
          <span>批次分析</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <h1>OLAM数据分析系统</h1>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100vh;
}

.el-aside {
  background-color: #304156;
}

.el-menu {
  border-right: none;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
}

.el-header h1 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
