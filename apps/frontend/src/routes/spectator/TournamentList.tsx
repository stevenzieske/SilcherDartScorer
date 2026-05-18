import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { useTournamentStore } from '../../stores/tournament.store'
import type { Tournament } from '@dart/shared'
import { TournamentStatus } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

export default function TournamentList() {
    const navigate = useNavigate()
    const { tournaments, setTournaments } = useTournamentStore()

    useEffect(() => {
        http.get<Tournament[]>('/tournaments').then(r => {
            setTournaments(r.data)
            const active = r.data.find(t => t.status === TournamentStatus.Active)
            if (active) navigate(`/spectator/tournaments/${active._id}`, { replace: true })
        })
    }, [])

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 py-6">
                <div className="mb-6"><HomeButton /></div>
                <h1 className="text-2xl font-bold mb-6">Tournaments</h1>
                {tournaments.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                        <p className="text-gray-500">No tournaments available</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {tournaments.map(t => (
                            <div key={t._id}
                                onClick={() => navigate(`/spectator/tournaments/${t._id}`)}
                                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 cursor-pointer rounded-2xl px-5 py-4 flex items-center justify-between transition-colors">
                                <div>
                                    <p className="font-semibold">{t.name}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{t.players.length} players</p>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                    t.status === 'active' ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'
                                }`}>{t.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
