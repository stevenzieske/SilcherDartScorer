import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { PlayerDocument, PlayerModel } from '../players/player.schema'
import { MatchDocument, MatchModel } from '../matches/match.schema'
import { MatchEventDocument, MatchEventModel } from '../match-events/match-event.schema'
import { TournamentDocument, TournamentModel } from '../tournaments/tournament.schema'
import { MatchEventType, MatchStatus } from '@dart/shared'
import type { TurnData } from '@dart/shared'

const THROW_TYPES = [MatchEventType.Throw, MatchEventType.Bust, MatchEventType.Checkout]

interface RawStats {
    dartsThrown: number
    turnScoreTotal: number
    checkoutAttempts: number
    checkoutHits: number
    oneEighties: number
    hundredPlus: number
    hundredFortyPlus: number
    highestCheckout: number
    bestLegDarts: number
    matchesPlayed: number
    matchesWon: number
    legsWon: number
}

function emptyRaw(): RawStats {
    return { dartsThrown: 0, turnScoreTotal: 0, checkoutAttempts: 0, checkoutHits: 0, oneEighties: 0, hundredPlus: 0, hundredFortyPlus: 0, highestCheckout: 0, bestLegDarts: 0, matchesPlayed: 0, matchesWon: 0, legsWon: 0 }
}

function avg3(raw: RawStats): number {
    return raw.dartsThrown > 0 ? Math.round((raw.turnScoreTotal / raw.dartsThrown) * 3 * 10) / 10 : 0
}

function checkoutRate(raw: RawStats): number {
    return raw.checkoutAttempts > 0 ? Math.round((raw.checkoutHits / raw.checkoutAttempts) * 100 * 10) / 10 : 0
}

function groupEventsByMatch(events: MatchEventDocument[]): Map<string, MatchEventDocument[]> {
    const map = new Map<string, MatchEventDocument[]>()
    for (const event of events) {
        const list = map.get(event.matchId) ?? []
        list.push(event)
        map.set(event.matchId, list)
    }
    return map
}

@Injectable()
export class StatsService {
    constructor(
        @InjectModel(PlayerModel.name) private readonly playerModel: Model<PlayerDocument>,
        @InjectModel(MatchModel.name) private readonly matchModel: Model<MatchDocument>,
        @InjectModel(MatchEventModel.name) private readonly eventModel: Model<MatchEventDocument>,
        @InjectModel(TournamentModel.name) private readonly tournamentModel: Model<TournamentDocument>,
    ) { }

    private accumulateMatchStats(
        playerId: string,
        matches: MatchDocument[],
        eventsByMatch: Map<string, MatchEventDocument[]>,
    ): RawStats {
        const stats = emptyRaw()

        for (const match of matches) {
            stats.matchesPlayed++
            if (match.winnerId === playerId) stats.matchesWon++

            const events = eventsByMatch.get(match._id.toString()) ?? []

            const legDarts = new Map<number, number>()
            const legWinners = new Map<number, string>()

            for (const event of events) {
                if (THROW_TYPES.includes(event.type) && event.data) {
                    const turn = event.data as TurnData
                    if (turn.playerId !== playerId) continue

                    stats.dartsThrown += turn.darts.length
                    if (!turn.isBust) stats.turnScoreTotal += turn.turnScore
                    if (turn.turnScore === 180) stats.oneEighties++
                    if (turn.turnScore >= 140) stats.hundredFortyPlus++
                    if (turn.turnScore >= 100) stats.hundredPlus++
                    if (turn.remainingBefore <= 170) stats.checkoutAttempts++
                    if (turn.isCheckout) {
                        stats.checkoutHits++
                        if (turn.turnScore > stats.highestCheckout) stats.highestCheckout = turn.turnScore
                    }

                    legDarts.set(turn.legNumber, (legDarts.get(turn.legNumber) ?? 0) + turn.darts.length)
                }

                if (event.type === MatchEventType.LegEnded && event.data) {
                    const { winnerId } = event.data as { winnerId: string }
                    legWinners.set(event.legNumber, winnerId)
                }
            }

            for (const [legNumber, winnerId] of legWinners) {
                if (winnerId === playerId) {
                    stats.legsWon++
                    const darts = legDarts.get(legNumber) ?? 0
                    if (darts > 0 && (stats.bestLegDarts === 0 || darts < stats.bestLegDarts)) {
                        stats.bestLegDarts = darts
                    }
                }
            }
        }

        return stats
    }

    async getPlayerStats(playerId: string) {
        const player = await this.playerModel.findById(playerId).exec()
        if (!player) throw new NotFoundException('Player not found')

        const allMatches = await this.matchModel
            .find({ players: playerId, status: MatchStatus.Completed })
            .exec()

        // Load all events in a single batch query
        const allMatchIds = allMatches.map(m => m._id.toString())
        const allEvents = allMatchIds.length > 0
            ? await this.eventModel.find({ matchId: { $in: allMatchIds } }).sort({ matchId: 1, sequence: 1 }).exec()
            : []
        const eventsByMatch = groupEventsByMatch(allEvents)

        // Bucket matches by tournament (or quick match)
        const byTournament = new Map<string, MatchDocument[]>()
        const quickMatches: MatchDocument[] = []
        for (const match of allMatches) {
            if (!match.tournamentId) {
                quickMatches.push(match)
                continue
            }
            if (!byTournament.has(match.tournamentId)) byTournament.set(match.tournamentId, [])
            byTournament.get(match.tournamentId)!.push(match)
        }

        const overall = this.accumulateMatchStats(playerId, allMatches, eventsByMatch)

        // Load tournament documents in a single batch query
        const tournamentIds = Array.from(byTournament.keys())
        const tournaments = tournamentIds.length > 0
            ? await this.tournamentModel.find({ _id: { $in: tournamentIds } }).exec()
            : []
        const tournamentById = new Map(tournaments.map(t => [t._id.toString(), t as TournamentDocument]))

        const tournamentHistory: Array<{
            tournamentId: string
            tournamentName: string
            status: string
            placement: number | null
            matchesPlayed: number
            matchesWon: number
            legsWon: number
            average: number
            highestCheckout: number
            date: string
            isQuickMatch: boolean
        }> = []

        for (const [tid, matches] of byTournament) {
            const tournament = tournamentById.get(tid)
            if (!tournament) continue
            const tStats = this.accumulateMatchStats(playerId, matches, eventsByMatch)
            const placement = (tournament.placements as Record<string, number> | undefined)?.[playerId] ?? null
            const tObj = tournament.toObject() as { createdAt?: string } & typeof tournament
            tournamentHistory.push({
                tournamentId: tid,
                tournamentName: tournament.name,
                status: tournament.status,
                placement,
                matchesPlayed: tStats.matchesPlayed,
                matchesWon: tStats.matchesWon,
                legsWon: tStats.legsWon,
                average: avg3(tStats),
                highestCheckout: tStats.highestCheckout,
                date: tournament.startedAt ?? (tObj.createdAt ?? ''),
                isQuickMatch: false,
            })
        }

        for (const match of quickMatches) {
            const qStats = this.accumulateMatchStats(playerId, [match], eventsByMatch)
            tournamentHistory.push({
                tournamentId: match._id.toString(),
                tournamentName: 'Quick Match',
                status: 'completed',
                placement: null,
                matchesPlayed: qStats.matchesPlayed,
                matchesWon: qStats.matchesWon,
                legsWon: qStats.legsWon,
                average: avg3(qStats),
                highestCheckout: qStats.highestCheckout,
                date: match.endedAt ?? match.startedAt ?? '',
                isQuickMatch: true,
            })
        }

        tournamentHistory.sort((a, b) => b.date.localeCompare(a.date))

        return {
            player: player.toObject(),
            stats: {
                ...overall,
                average: avg3(overall),
                checkoutRate: checkoutRate(overall),
                hundredPlus: overall.hundredPlus,
                hundredFortyPlus: overall.hundredFortyPlus,
            },
            tournamentHistory,
        }
    }

    async getTournamentStats(tournamentId: string) {
        const tournament = await this.tournamentModel.findById(tournamentId).exec()
        if (!tournament) throw new NotFoundException('Tournament not found')

        const matches = await this.matchModel
            .find({ tournamentId, status: MatchStatus.Completed })
            .exec()

        // Load all events in a single batch query
        const matchIds = matches.map(m => m._id.toString())
        const allEvents = matchIds.length > 0
            ? await this.eventModel.find({ matchId: { $in: matchIds } }).sort({ matchId: 1, sequence: 1 }).exec()
            : []
        const eventsByMatch = groupEventsByMatch(allEvents)

        const perPlayer = new Map<string, RawStats>()

        function getPlayer(pid: string) {
            if (!perPlayer.has(pid)) perPlayer.set(pid, emptyRaw())
            return perPlayer.get(pid)!
        }

        for (const match of matches) {
            const events = eventsByMatch.get(match._id.toString()) ?? []

            const legDarts = new Map<string, number>()
            const legWinners = new Map<number, string>()

            for (const event of events) {
                if (THROW_TYPES.includes(event.type) && event.data) {
                    const turn = event.data as TurnData
                    const s = getPlayer(turn.playerId)

                    s.dartsThrown += turn.darts.length
                    if (!turn.isBust) s.turnScoreTotal += turn.turnScore
                    if (turn.turnScore === 180) s.oneEighties++
                    if (turn.turnScore >= 140) s.hundredFortyPlus++
                    if (turn.turnScore >= 100) s.hundredPlus++
                    if (turn.remainingBefore <= 170) s.checkoutAttempts++
                    if (turn.isCheckout) {
                        s.checkoutHits++
                        if (turn.turnScore > s.highestCheckout) s.highestCheckout = turn.turnScore
                    }

                    const key = `${turn.legNumber}:${turn.playerId}`
                    legDarts.set(key, (legDarts.get(key) ?? 0) + turn.darts.length)
                }

                if (event.type === MatchEventType.LegEnded && event.data) {
                    const { winnerId } = event.data as { winnerId: string }
                    legWinners.set(event.legNumber, winnerId)
                }
            }

            for (const [legNumber, winnerId] of legWinners) {
                const darts = legDarts.get(`${legNumber}:${winnerId}`) ?? 0
                if (darts > 0) {
                    const s = getPlayer(winnerId)
                    if (s.bestLegDarts === 0 || darts < s.bestLegDarts) s.bestLegDarts = darts
                }
            }
        }

        const entries = Array.from(perPlayer.entries()).map(([playerId, s]) => ({
            playerId,
            average: avg3(s),
            highestCheckout: s.highestCheckout,
            checkoutRate: checkoutRate(s),
            oneEighties: s.oneEighties,
            bestLegDarts: s.bestLegDarts,
            hundredPlus: s.hundredPlus,
            hundredFortyPlus: s.hundredFortyPlus,
        }))

        const best = (key: keyof typeof entries[0], asc = false) => {
            const filtered = entries.filter(e => (e[key] as number) > 0)
            if (!filtered.length) return null
            const sorted = [...filtered].sort((a, b) =>
                asc ? (a[key] as number) - (b[key] as number) : (b[key] as number) - (a[key] as number)
            )
            const topValue = sorted[0][key] as number
            return sorted.filter(e => (e[key] as number) === topValue)
        }

        return {
            tournamentId,
            tournamentName: tournament.name,
            totalMatches: matches.length,
            allEntries: entries,
            highestAverage: best('average'),
            highestCheckout: best('highestCheckout'),
            bestCheckoutRate: best('checkoutRate'),
            bestLeg: best('bestLegDarts', true),
            most180s: best('oneEighties'),
            most100Plus: best('hundredPlus'),
            most140Plus: best('hundredFortyPlus'),
        }
    }
}
