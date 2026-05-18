import { useNavigate } from 'react-router-dom'
import { socket } from '../socket/socket.client'

export default function Landing() {
    const navigate = useNavigate()

    function enter(path: string) {
        if (!socket.connected) socket.connect()
        navigate(path)
    }

    return (
        <div className="h-[100dvh] overflow-hidden bg-gray-950 flex flex-col">
            {/* Top-right buttons */}
            <div className="flex justify-end items-center gap-2 px-4"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <button
                    onClick={() => enter('/admin/players')}
                    className="bg-blue-950 hover:bg-blue-900 border border-blue-900 text-blue-400 font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
                    Players
                </button>
                <button
                    onClick={() => enter('/admin/login')}
                    className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
                    Tournament Admin
                </button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white tracking-tight">Silcher Dart Scorer</h1>
                    <p className="text-gray-500 mt-2 text-sm">Select your role to continue</p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => enter('/spectator')}
                            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-white font-semibold py-6 rounded-2xl text-base transition-colors">
                            Spectator
                        </button>
                        <button onClick={() => enter('/judge')}
                            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-white font-semibold py-6 rounded-2xl text-base transition-colors">
                            Judge
                        </button>
                    </div>
                    <button onClick={() => enter('/stats')}
                        className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-white font-semibold py-4 rounded-2xl text-base transition-colors w-full">
                        Stats
                    </button>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <button onClick={() => enter('/quick-match')}
                            className="bg-white hover:bg-gray-100 text-gray-950 font-semibold py-4 rounded-2xl text-base transition-colors w-full">
                            Quick Match
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
