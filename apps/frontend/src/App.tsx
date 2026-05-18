import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './routes/Landing'
import AdminLogin from './routes/admin/AdminLogin'
import AdminDashboard from './routes/admin/AdminDashboard'
import TournamentNew from './routes/admin/TournamentNew'
import TournamentManage from './routes/admin/TournamentManage'
import PlayerList from './routes/admin/PlayerList'
import TournamentList from './routes/spectator/TournamentList'
import TournamentView from './routes/spectator/TournamentView'
import SpectatorMatch from './routes/spectator/SpectatorMatch'
import MatchSelect from './routes/judge/MatchSelect'
import JudgeMatch from './routes/judge/JudgeMatch'
import PlayerStatsList from './routes/stats/PlayerStatsList'
import PlayerStatsPage from './routes/stats/PlayerStatsPage'
import TournamentStatsPage from './routes/stats/TournamentStatsPage'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/bigscreen" element={<Navigate to="/spectator" replace />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/tournaments/new" element={<TournamentNew />} />
                <Route path="/admin/tournaments/:id" element={<TournamentManage />} />
                <Route path="/admin/players" element={<PlayerList />} />
                <Route path="/spectator" element={<TournamentList />} />
                <Route path="/spectator/tournaments/:id" element={<TournamentView />} />
                <Route path="/spectator/tournaments/:id/matches/:matchId" element={<SpectatorMatch />} />
                <Route path="/judge" element={<MatchSelect />} />
                <Route path="/judge/matches/:id" element={<JudgeMatch />} />
                <Route path="/stats" element={<PlayerStatsList />} />
                <Route path="/stats/players/:id" element={<PlayerStatsPage />} />
                <Route path="/stats/tournaments/:id" element={<TournamentStatsPage />} />
            </Routes>
        </BrowserRouter>
    )
}
