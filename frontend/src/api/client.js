const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function readErrorMessage(response) {
  let detail
  try {
    const data = await response.json()
    detail = data.detail
  } catch {

    if (typeof detail === 'string') return { message: detail, detail }
    if (Array.isArray(detail)) return { messgae: detail.map((d) => d.msg).join(' '), detail }
    if (detail && typeof detail.message === 'string') return { message: detail.message, detail }
    return 'Something went wrong. Please try again.'
      // The response was not JSON. Fall through to the default message.
  }
  
}

export async function apiRequest(path, { method = 'GET', token, body, form, formData } = {}) {
  const headers = {}
  let payload

  if (token) headers.Authorization = `Bearer ${token}`

  if (formData) {
    payload = formData
  } else if (form) {
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
    const { message, detail } =await parseError(response)
    throw new ApiError(await readErrorMessage(response), response.status)
  }
  return response.json()
}