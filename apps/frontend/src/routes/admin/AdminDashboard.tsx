import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTournamentStore } from '../../stores/tournament.store'
import http from '../../api/client'
import type { Tournament } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'

const NUKE_CONFIRM_WORD = 'NUKE'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const { tournaments, setTournaments } = useTournamentStore()

    // backup state
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // tournament delete state
    const [confirmDelete, setConfirmDelete] = useState<Tournament | null>(null)
    const [deleting, setDeleting] = useState(false)

    // nuke state
    const [showNuke, setShowNuke] = useState(false)
    const [nukeInput, setNukeInput] = useState('')
    const [nuking, setNuking] = useState(false)

    useEffect(() => {
        http.get<Tournament[]>('/tournaments').then(r => setTournaments(r.data))
    }, [])

    async function handleExport() {
        setExporting(true)
        setFeedback(null)
        try {
            const res = await http.get('/admin/backup/export')
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `silcher-dart-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            setFeedback({ ok: false, msg: 'Export failed' })
        } finally {
            setExporting(false)
        }
    }

    async function handleImportConfirm() {
        if (!importFile) return
        setImporting(true)
        setFeedback(null)
        try {
            const text = await importFile.text()
            const data = JSON.parse(text)
            await http.post('/admin/backup/import', data)
            setImportFile(null)
            setFeedback({ ok: true, msg: 'Import successful — reloading…' })
            setTimeout(() => window.location.reload(), 1200)
        } catch {
            setFeedback({ ok: false, msg: 'Import failed — check the file and try again' })
            setImporting(false)
            setImportFile(null)
        }
    }

    async function handleDeleteTournament() {
        if (!confirmDelete) return
        setDeleting(true)
        try {
            await http.delete(`/tournaments/${confirmDelete._id}`)
            setTournaments(tournaments.filter(t => t._id !== confirmDelete._id))
            setConfirmDelete(null)
        } catch {
            setConfirmDelete(null)
        } finally {
            setDeleting(false)
        }
    }

    async function handleNuke() {
        if (nukeInput !== NUKE_CONFIRM_WORD) return
        setNuking(true)
        try {
            await http.delete('/admin/backup/nuke')
            setFeedback({ ok: true, msg: 'All data wiped — reloading…' })
            setShowNuke(false)
            setTimeout(() => window.location.reload(), 1200)
        } catch {
            setFeedback({ ok: false, msg: 'Nuke failed' })
            setNuking(false)
            setShowNuke(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-2xl mx-auto px-4 pb-6"
                style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center justify-between mb-6">
                    <BackButton to="/" label="Home" />
                    <button onClick={() => navigate('/admin/players')}
                        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                        Players <span className="text-gray-600">→</span>
                    </button>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Tournaments</h1>
                    <button onClick={() => navigate('/admin/tournaments/new')}
                        className="bg-white hover:bg-gray-200 text-gray-950 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        + New
                    </button>
                </div>

                {tournaments.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                        <p className="text-gray-500">No tournaments yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {tournaments.map(t => (
                            <div key={t._id}
                                onClick={() => navigate(`/admin/tournaments/${t._id}`)}
                                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 cursor-pointer rounded-2xl px-5 py-4 flex items-center justify-between gap-3 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate">{t.name}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{t.players.length} players</p>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                                    t.status === 'active' ? 'bg-green-900 text-green-400' :
                                    'bg-gray-800 text-gray-400'
                                }`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
                                <button
                                    onClick={e => { e.stopPropagation(); setConfirmDelete(t) }}
                                    className="text-gray-600 hover:text-red-400 text-sm px-1 py-1 shrink-0 transition-colors">
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Backup */}
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Data</h2>
                    <div className="flex gap-3">
                        <button onClick={handleExport} disabled={exporting}
                            className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 border border-gray-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                            {exporting ? 'Exporting…' : 'Export'}
                        </button>
                        <button onClick={() => { setFeedback(null); fileInputRef.current?.click() }}
                            className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                            Import
                        </button>
                        <button onClick={() => { setFeedback(null); setNukeInput(''); setShowNuke(true) }}
                            className="flex-1 bg-gray-900 hover:bg-red-950 border border-gray-800 hover:border-red-900 text-red-500 font-semibold py-3 rounded-xl text-sm transition-colors">
                            Nuke
                        </button>
                        <input ref={fileInputRef} type="file" accept=".json" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) { setImportFile(f); e.target.value = '' } }} />
                    </div>
                    {feedback && (
                        <p className={`text-sm mt-3 text-center ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
                            {feedback.msg}
                        </p>
                    )}
                </div>
            </div>

            {/* Tournament delete confirmation */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
                        <h2 className="text-lg font-bold mb-2">Delete tournament?</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            <span className="text-white font-medium">{confirmDelete.name}</span> and all its matches and stats will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDeleteTournament} disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import confirmation */}
            {importFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
                        <h2 className="text-lg font-bold mb-2">Replace all data?</h2>
                        <p className="text-gray-400 text-sm mb-1">
                            Importing <span className="text-white font-medium">{importFile.name}</span> will permanently replace all current players, tournaments, matches, and stats.
                        </p>
                        <p className="text-gray-500 text-xs mb-6">This cannot be undone. Export first if you want to keep the current state.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setImportFile(null)} disabled={importing}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleImportConfirm} disabled={importing}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                {importing ? 'Importing…' : 'Replace & Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nuke confirmation */}
            {showNuke && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in">
                    <div className="bg-gray-900 border border-red-900 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
                        <h2 className="text-lg font-bold mb-1 text-red-400">Wipe all data</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            This permanently deletes every player, tournament, match, and stat. There is no undo.
                        </p>
                        <p className="text-gray-500 text-xs mb-2">
                            Type <span className="text-white font-mono font-bold">{NUKE_CONFIRM_WORD}</span> to confirm
                        </p>
                        <input
                            type="text"
                            value={nukeInput}
                            onChange={e => setNukeInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleNuke()}
                            placeholder={NUKE_CONFIRM_WORD}
                            autoFocus
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono placeholder-gray-600 outline-none focus:border-red-700 mb-4 transition-colors"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowNuke(false)} disabled={nuking}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleNuke}
                                disabled={nuking || nukeInput !== NUKE_CONFIRM_WORD}
                                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                {nuking ? 'Wiping…' : 'Wipe Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
