import { createRouter, createMemoryHistory } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/data-import'
    },
    {
      path: '/data-import',
      name: 'data-import',
      component: () => import('@/views/DataImportView.vue')
    },
    {
      path: '/tag-manage',
      name: 'tag-manage',
      component: () => import('@/views/TagManageView.vue')
    },
    {
      path: '/task-manage',
      name: 'task-manage',
      component: () => import('@/views/TaskManageView.vue')
    },
    {
      path: '/result-map',
      name: 'result-map',
      component: () => import('@/views/ResultMapView.vue')
    }
  ]
})

export default router
