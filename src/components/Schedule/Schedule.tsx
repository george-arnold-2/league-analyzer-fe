import { useState, useEffect, useCallback } from 'react';
import Roster from '../Roster/Roster';

interface Matchup {
    matchup_id: number;
    roster_id: number;
    points: number;
    players: string[];
}

interface ScheduleProps {
    leagueId: string;
    week: number;
}

export default function Schedule({ leagueId, week }: ScheduleProps) {
    const [matchups, setMatchups] = useState<Matchup[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [rosterTotals, setRosterTotals] = useState<Record<string, number>>(
        {}
    );

    const handleRosterTotalUpdate = useCallback(
        (rosterName: string, total: number) => {
            setRosterTotals((prev) => {
                // Avoid unnecessary state updates
                if (prev[rosterName] === total) return prev;
                return {
                    ...prev,
                    [rosterName]: total,
                };
            });
        },
        []
    );

    useEffect(() => {
        const fetchMatchups = async () => {
            if (!leagueId) {
                setError('No league ID provided.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const res = await fetch(
                    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
                );
                if (!res.ok) throw new Error('Failed to fetch matchups');
                const data = (await res.json()) as Matchup[];
                setMatchups(data);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Unknown error fetching matchups.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchMatchups();
    }, [leagueId, week]);

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-lg text-gray-700">
                        Loading schedule...
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const groupedMatchups = Object.values(
        matchups.reduce<
            Record<string, { rosters: string[]; points: number[] }>
        >((acc, m) => {
            if (!acc[m.matchup_id]) {
                acc[m.matchup_id] = { rosters: [], points: [] };
            }
            acc[m.matchup_id].rosters.push(`Roster ${m.roster_id}`);
            acc[m.matchup_id].points.push(m.points);
            return acc;
        }, {})
    );

    return (
        <div className="p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-400 px-6 py-4 -mx-6 -mt-6 mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                    <svg
                        className="w-6 h-6 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    Week {week} Matchups
                </h2>
            </div>

            {matchups.length === 0 ? (
                <div className="text-center py-12">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                        No matchups found
                    </h3>
                    <p className="mt-1 text-gray-500">
                        There are no matchups available for this week.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedMatchups.map((matchup, i) => (
                        <div
                            key={i}
                            className="bg-gray-50 rounded-xl p-6 shadow-sm"
                        >
                            {/* Matchup Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Matchup {i + 1}
                                    </h3>
                                </div>
                                <div className="h-px bg-gradient-to-r from-green-200 via-green-300 to-green-200"></div>
                            </div>

                            {/* Rosters Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span
                                            id="matchup-total"
                                            className="text-lg font-bold text-green-600"
                                        >
                                            {rosterTotals[matchup.rosters[0]]
                                                ? `${rosterTotals[
                                                      matchup.rosters[0]
                                                  ].toFixed(2)} pts`
                                                : `${matchup.points[0]} pts`}
                                        </span>
                                    </div>
                                    <Roster
                                        leagueId={leagueId}
                                        matchupRoster={matchup.rosters[0]}
                                        rosterName={matchup.rosters[0]}
                                        onTotalUpdate={handleRosterTotalUpdate}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold text-green-600">
                                            {rosterTotals[matchup.rosters[1]]
                                                ? `${rosterTotals[
                                                      matchup.rosters[1]
                                                  ].toFixed(2)} pts`
                                                : `${matchup.points[1]} pts`}
                                        </span>
                                    </div>
                                    <Roster
                                        leagueId={leagueId}
                                        matchupRoster={matchup.rosters[1]}
                                        rosterName={matchup.rosters[1]}
                                        onTotalUpdate={handleRosterTotalUpdate}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
