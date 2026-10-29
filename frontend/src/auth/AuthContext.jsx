import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'

const TOKEN_KEY = 'access_token'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [clinician, setClinician] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setClinician(null)
      setLoading(false)
      return
    }
    let cancelled = false
    apiRequest('/auth/me', { token })
      .then((data) => {
        if (!cancelled) setClinician(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.status === 401) {
          clearToken()
          setToken(null)
        }
        setClinician(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      form: { username: email, password },
    })
    saveToken(data.access_token)
    setLoading(true)
    setToken(data.access_token)
  }

  async function register(fullName, email, password) {
    await apiRequest('/auth/signup', {
      method: 'POST',
      body: { full_name: fullName, email, password },
    })
    try {
      await login(email, password)
    } catch {
      const error = new ApiError(
        'Account created, but automatic login failed. Please log in.',
        0,
      )
      error.accountCreated = true
      throw error
    }
  }

  function logout() {
    clearToken()
    setToken(null)
    setClinician(null)
  }

  return (
    <AuthContext.Provider value={{ token, clinician, loading, login, register,logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}