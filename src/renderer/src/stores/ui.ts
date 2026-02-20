import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const activeTab = ref('data-import')

  function setActiveTab(tab: string) {
    activeTab.value = tab
  }

  return { activeTab, setActiveTab }
})
