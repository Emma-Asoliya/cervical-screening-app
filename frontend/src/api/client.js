const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function readErrorMessage(response) {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join(' ')
  } catch {
    // The response was not JSON. Fall through to the default message.
  }
  return 'Something went wrong. Please try again.'
}

export async function apiRequest(path, { method = 'GET', token, body, form } = {}) {
  const headers = {}
  let payload

  if (token) headers.Authorization = `Bearer ${token}`

  if (form) {
    payload = new URLSearchParams(form)
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }
  return response.json()
}