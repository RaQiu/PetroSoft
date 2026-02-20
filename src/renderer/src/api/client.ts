import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:20022/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default apiClient
