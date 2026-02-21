import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const activeTab = ref('data-import')

  /** Global outlier removal method, shared by all charting components. */
  const outlierMethod = ref('iqr')

  function setActiveTab(tab: string) {
    activeTab.value = tab
  }

  return { activeTab, outlierMethod, setActiveTab }
})
