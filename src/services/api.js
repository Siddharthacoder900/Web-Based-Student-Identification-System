import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export function getApiError(error) {
  if (error.response?.data?.message) return error.response.data.message
  if (error.response?.data?.details?.length) return error.response.data.details.join(' ')
  if (!error.request && error.message) return error.message
  return 'BIET services could not be reached. Check the API and MongoDB configuration.'
}
