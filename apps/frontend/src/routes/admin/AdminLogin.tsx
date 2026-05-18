import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../../stores/auth.store'

export default function AdminLogin() {
    const navigate = useNavigate()
    const { setPin } = useAuthStore()
    const [input, setInput] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function login() {
        const pin = input.trim()
        if (!pin) return
        setLoading(true)
        setError('')
        try {
            await axios.get('/api/auth/verify', {
                headers: { Authorization: `Bearer ${pin}` },
            })
            setPin(pin)
            navigate('/admin')
        } catch {
            setError('Incorrect PIN')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 gap-6 animate-slide-up">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Admin</h1>
                <p className="text-gray-500 text-sm mt-1">Enter your PIN to continue</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4 w-full max-w-xs">
                <input
                    type="password"
                    inputMode="numeric"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && login()}
                    placeholder="PIN"
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 text-center text-2xl tracking-widest transition-colors"
                    autoFocus
                />
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button onClick={login} disabled={loading}
                    className="bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 py-3 rounded-xl font-semibold transition-colors">
                    {loading ? 'Checking…' : 'Enter'}
                </button>
                <button onClick={() => navigate('/')}
                    className="text-gray-500 hover:text-white text-sm text-center transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    )
}
