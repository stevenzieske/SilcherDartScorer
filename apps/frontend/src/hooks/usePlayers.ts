import { useEffect } from 'react'
import http from '../api/client'
import { usePlayersStore } from '../stores/players.store'
import type { Player } from '@dart/shared'

export function usePlayers() {
    const { players, setPlayers, getName } = usePlayersStore()

    useEffect(() => {
        http.get<Player[]>('/players').then(r => setPlayers(r.data)).catch(() => {})
    }, [])

    return { players, getName }
}
