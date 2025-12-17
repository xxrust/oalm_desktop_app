import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue')
    },
    {
      path: '/variance',
      name: 'variance',
      component: () => import('../views/Variance.vue')
    },
    {
      path: '/grid',
      name: 'grid',
      component: () => import('../views/Grid.vue')
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: () => import('../views/Timeline.vue')
    },
    {
      path: '/device',
      name: 'device',
      component: () => import('../views/Device.vue')
    },
    {
      path: '/operator',
      name: 'operator',
      component: () => import('../views/Operator.vue')
    },
    {
      path: '/batch',
      name: 'batch',
      component: () => import('../views/BatchAnalysis.vue')
    }
  ]
})

export default router 
