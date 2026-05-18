import axios from "axios";

const http = axios.create({
    baseURL: '/api',
})

http.interceptors.request.use(config => {
    const raw = localStorage.getItem('auth')
    const pin = raw ? JSON.parse(raw)?.state?.pin : null
    if (pin) config.headers.set('Authorization', `Bearer ${pin}`)
    return config
})

http.interceptors.response.use(
    res => res,
    err => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('auth')
            window.location.href = '/admin/login'
        }
        return Promise.reject(err)
    }
)

export default http
