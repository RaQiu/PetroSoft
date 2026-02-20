import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface DatasetRef {
  id: string
  name: string
  type: string
  createdAt: string
}

export const useDataStore = defineStore('data', () => {
  const datasets = ref<DatasetRef[]>([])

  function addDataset(dataset: DatasetRef) {
    datasets.value.push(dataset)
  }

  function removeDataset(id: string) {
    datasets.value = datasets.value.filter((d) => d.id !== id)
  }

  function clearDatasets() {
    datasets.value = []
  }

  return { datasets, addDataset, removeDataset, clearDatasets }
})
