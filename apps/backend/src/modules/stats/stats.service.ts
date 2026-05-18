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
    highestCheckout: number
    bestLegDarts: number
    matchesPlayed: number
    matchesWon: number
    legsWon: number
}

function emptyRaw(): RawStats {
    return { dartsThrown: 0, turnScoreTotal: 0, checkoutAttempts: 0, checkoutHits: 0, oneEighties: 0, highestCheckout: 0, bestLegDarts: 0, matchesPlayed: 0, matchesWon: 0, legsWon: 0 }
}

function avg3(raw: RawStats): number {
    return raw.dartsThrown > 0 ? Math.round((raw.turnScoreTotal / raw.dartsThrown) * 3 * 10) / 10 : 0
}

function checkoutRate(raw: RawStats): number {
    return raw.checkoutAttempts > 0 ? Math.round((raw.checkoutHits / raw.checkoutAttempts) * 100 * 10) / 10 : 0
}

@Injectable()
export class StatsService {
    constructor(
        @InjectModel(PlayerModel.name) private readonly playerModel: Model<PlayerDocument>,
        @InjectModel(MatchModel.name) private readonly matchModel: Model<MatchDocument>,
        @InjectModel(MatchEventModel.name) private readonly eventModel: Model<MatchEventDocument>,
        @InjectModel(TournamentModel.name) private readonly tournamentModel: Model<TournamentDocument>,
    ) { }

    private async accumulateMatchStats(playerId: string, matches: MatchDocument[]): Promise<RawStats> {
        const stats = emptyRaw()

        for (const match of matches) {
            stats.matchesPlayed++
            if (match.winnerId === playerId) stats.matchesWon++

            const events = await this.eventModel
                .find({ matchId: match._id.toString() })
                .sort({ sequence: 1 })
                .exec()

            const legDarts = new Map<number, number>()
            const legWinners = new Map<number, string>()

            for (const event of events) {
                if (THROW_TYPES.includes(event.type) && event.data) {
                    const turn = event.data as TurnData
                    if (turn.playerId !== playerId) continue

                    stats.dartsThrown += turn.darts.length
                    if (!turn.isBust) stats.turnScoreTotal += turn.turnScore
                    if (turn.turnScore === 180) stats.oneEighties++
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

        const byTournament = new Map<string, MatchDocument[]>()
        for (const match of allMatches) {
            const tid = match.tournamentId
            if (!byTournament.has(tid)) byTournament.set(tid, [])
            byTournament.get(tid)!.push(match)
        }

        const overall = await this.accumulateMatchStats(playerId, allMatches)

        const tournamentHistory: Array<{
            tournamentId: string; tournamentName: string; status: string
            placement: number | null; matchesPlayed: number; matchesWon: number
            legsWon: number; average: number; highestCheckout: number; date: string
        }> = []
        for (const [tid, matches] of byTournament) {
            const tournament = await this.tournamentModel.findById(tid).exec()
            if (!tournament) continue
            const tStats = await this.accumulateMatchStats(playerId, matches)
            const placement = tournament.placements?.[playerId] ?? null
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
            })
        }

        tournamentHistory.sort((a, b) => b.date.localeCompare(a.date))

        return {
            player: player.toObject(),
            stats: {
                ...overall,
                average: avg3(overall),
                checkoutRate: checkoutRate(overall),
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

        const perPlayer = new Map<string, RawStats & { playerForLeg: Map<number, number> }>()

        function getPlayer(pid: string) {
            if (!perPlayer.has(pid)) perPlayer.set(pid, { ...emptyRaw(), playerForLeg: new Map() })
            return perPlayer.get(pid)!
        }

        for (const match of matches) {
            const events = await this.eventModel
                .find({ matchId: match._id.toString() })
                .sort({ sequence: 1 })
                .exec()

            const legDarts = new Map<string, number>()
            const legWinners = new Map<number, string>()

            for (const event of events) {
                if (THROW_TYPES.includes(event.type) && event.data) {
                    const turn = event.data as TurnData
                    const s = getPlayer(turn.playerId)

                    s.dartsThrown += turn.darts.length
                    if (!turn.isBust) s.turnScoreTotal += turn.turnScore
                    if (turn.turnScore === 180) s.oneEighties++
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
        }))

        const best = (key: keyof typeof entries[0], asc = false) => {
            const filtered = entries.filter(e => (e[key] as number) > 0)
            if (!filtered.length) return null
            return [...filtered].sort((a, b) =>
                asc ? (a[key] as number) - (b[key] as number) : (b[key] as number) - (a[key] as number)
            )[0]
        }

        return {
            tournamentId,
            tournamentName: tournament.name,
            totalMatches: matches.length,
            highestAverage: best('average'),
            highestCheckout: best('highestCheckout'),
            bestCheckoutRate: best('checkoutRate'),
            bestLeg: best('bestLegDarts', true),
            most180s: best('oneEighties'),
        }
    }
}
