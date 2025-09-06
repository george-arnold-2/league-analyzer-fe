import { useEffect, useState, useCallback } from 'react';

interface RosterData {
    roster_id: number;
    players: string[];
    owner_id: string;
}

interface UserData {
    user_id: string;
    display_name: string;
    metadata: {
        team_name: string;
    };
}

interface RosterProps {
    leagueId: string;
    matchupRoster: string;
    rosterName?: string;
    onTotalUpdate?: (rosterName: string, total: number) => void;
    rosterData?: RosterData[] | null;
    userData?: UserData[] | null;
}

// Defines what a fantasy player object looks like from our local API
interface FantasyPlayer {
    Name: string;
    Position: string;
    'Projected Points': number;
    ID: string;
}

// current model for random projection generation for each iteration of scheduling
// ideally, this could be replaced by AI/LLM that is able to analyze NFL data to calculate the actual liklihood of given players scoring within ranges of projections
function getRandomProjection(base: number) {
    if (base <= 0) {
        return '0.00';
    }

    let result;
    const rand = Math.random();

    if (rand < 0.4) {
        // 40% chance: +/- 4 points, above is 2x as likely
        const direction = Math.random() < 0.666 ? 1 : -1; // 2/3 chance for +
        const variance = 4;
        result = base + variance * direction;
    } else if (rand < 0.6) {
        // Next 20%: +/- 6 points, above is 2x as likely
        const direction = Math.random() < 0.666 ? 1 : -1;
        const variance = 6;
        result = base + variance * direction;
    } else {
        // 40%: scaled result (as before)
        const scale = Math.max(2, base / 2);
        const min = Math.max(0, base - scale);
        const max = Math.min(30, base + scale);
        result = min + Math.random() * (max - min);
    }

    result = Math.max(0, Math.min(30, result));
    return result.toFixed(2);
}

export default function Roster({
    leagueId,
    matchupRoster,
    rosterName,
    onTotalUpdate,
    rosterData: propRosterData,
    userData: propUserData,
}: RosterProps) {
    // Use props if provided, otherwise fall back to local state for backward compatibility

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fantasyPlayerLookup, setFantasyPlayerLookup] = useState<
        Record<string, FantasyPlayer>
    >({});
    const [playerProjections, setPlayerProjections] = useState<
        Record<string, number>
    >({});

    // Use props data if available, otherwise use local state
    const rosterData = propRosterData;
    const userData = propUserData;

    // Fetch fantasy player data
    useEffect(() => {
        const fetchPlayerFantasyData = async (): Promise<void> => {
            if (!rosterData) return;

            setLoading(true);
            setError(null);

            try {
                const res = await fetch('http://localhost:4000/api/players');
                if (!res.ok)
                    throw new Error(`Error fetching players: ${res.status}`);
                const allFantasyPlayers: FantasyPlayer[] = await res.json();

                const lookup = allFantasyPlayers.reduce<
                    Record<string, FantasyPlayer>
                >((acc, player) => {
                    acc[player.ID] = player;
                    return acc;
                }, {});

                // console.log(lookup, 'fetchPlayerFantasyData lookups');

                setFantasyPlayerLookup(lookup);
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : 'Unknown error';
                setError(msg);
                console.error('Error fetching fantasy players:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerFantasyData();
    }, [rosterData]);

    // Generate random projections once when fantasy data is loaded
    useEffect(() => {
        if (
            rosterData &&
            fantasyPlayerLookup &&
            Object.keys(fantasyPlayerLookup).length > 0
        ) {
            const projections: Record<string, number> = {};

            rosterData.forEach((roster) => {
                roster.players.forEach((playerId) => {
                    if (!projections[playerId]) {
                        const fantasyPlayer = fantasyPlayerLookup[playerId];
                        const base = fantasyPlayer
                            ? fantasyPlayer['Projected Points'] / 17
                            : 0;
                        projections[playerId] = parseFloat(
                            getRandomProjection(base)
                        );
                    }
                });
            });

            setPlayerProjections(projections);
        }
    }, [rosterData, fantasyPlayerLookup]);

    // Position color mapping
    const getPositionColor = (position: string) => {
        switch (position) {
            case 'QB':
                return 'bg-purple-100 text-purple-800';
            case 'RB':
                return 'bg-blue-100 text-blue-800';
            case 'WR':
                return 'bg-yellow-100 text-yellow-800';
            case 'TE':
                return 'bg-orange-100 text-orange-800';
            case 'K':
                return 'bg-pink-100 text-pink-800';
            case 'DEF':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-green-100 text-green-800';
        }
    };

    // Sort and filter players for starting lineup
    const getStartingLineup = useCallback(
        (players: string[]) => {
            // Position order for starting lineup
            const positionOrder = [
                'QB',
                'RB',
                'RB',
                'WR',
                'WR',
                'TE',
                'DEF',
                'K',
            ];
            const playersWithProjections = players.map((playerId) => {
                const fantasyPlayer = fantasyPlayerLookup[playerId];
                const projectedPoints = playerProjections[playerId] || 0;

                return {
                    playerId,
                    fantasyPlayer,
                    projectedPoints,
                    position: fantasyPlayer?.Position || 'DEF',
                };
            });

            // Group players by position
            const playersByPosition = playersWithProjections.reduce(
                (acc, player) => {
                    const pos = player.position;
                    if (!acc[pos]) acc[pos] = [];
                    acc[pos].push(player);
                    return acc;
                },
                {} as Record<string, typeof playersWithProjections>
            );

            // Sort each position by projection (highest first)
            Object.keys(playersByPosition).forEach((pos) => {
                playersByPosition[pos].sort(
                    (a, b) => b.projectedPoints - a.projectedPoints
                );
            });

            // Build starting lineup in order
            const startingLineup: typeof playersWithProjections = [];
            const positionCounts: Record<string, number> = {};

            positionOrder.forEach((pos) => {
                const count = positionCounts[pos] || 0;
                positionCounts[pos] = count + 1;

                if (playersByPosition[pos] && playersByPosition[pos][count]) {
                    startingLineup.push(playersByPosition[pos][count]);
                }
            });

            return startingLineup;
        },
        [fantasyPlayerLookup, playerProjections]
    );

    // Calculate total projection for starting lineup
    const calculateStartingTotal = useCallback(
        (players: string[]) => {
            const startingLineup = getStartingLineup(players);
            return startingLineup.reduce(
                (total, player) => total + player.projectedPoints,
                0
            );
        },
        [getStartingLineup]
    );

    // Update parent component with total projection
    useEffect(() => {
        if (
            rosterData &&
            fantasyPlayerLookup &&
            Object.keys(fantasyPlayerLookup).length > 0
        ) {
            rosterData.forEach((roster, i) => {
                const matchupRosterNumber = Number(
                    matchupRoster.replace(/\D/g, '')
                );

                if (i + 1 === matchupRosterNumber) {
                    const totalProjection = calculateStartingTotal(
                        roster.players
                    );
                    if (onTotalUpdate && totalProjection > 0) {
                        onTotalUpdate(
                            rosterName ?? matchupRoster,
                            totalProjection
                        );
                    }
                }
            });
        }
    }, [
        rosterData,
        fantasyPlayerLookup,
        matchupRoster,
        rosterName,
        onTotalUpdate,
        calculateStartingTotal,
    ]);

    return (
        <div className="w-full">
            {loading && (
                <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    <span className="ml-2 text-green-700">
                        Loading fantasy data...
                    </span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                Error: {error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {rosterData &&
                rosterData.map((roster, i) => {
                    const matchupRosterNumber = Number(
                        matchupRoster.replace(/\D/g, '')
                    );

                    if (i + 1 !== matchupRosterNumber) return null;

                    const startingLineup = getStartingLineup(roster.players);

                    return (
                        <div
                            key={roster.roster_id}
                            className="bg-white rounded-lg shadow-md border border-green-200 overflow-hidden mb-4"
                        >
                            <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-400 px-4 py-3">
                                <h4 className="text-lg font-semibold text-white">
                                    {(() => {
                                        const owner = userData?.find(
                                            (user) =>
                                                user.user_id === roster.owner_id
                                        );
                                        return owner
                                            ? ` ${owner.display_name} (${
                                                  owner.metadata.team_name ??
                                                  'Team ' + owner.display_name
                                              })`
                                            : '';
                                    })()}
                                </h4>
                            </div>

                            <div className="p-4">
                                <div className="space-y-3">
                                    {startingLineup.map((player, index) => {
                                        return (
                                            <div
                                                key={`${player.playerId}-${index}`}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        {player.fantasyPlayer ? (
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionColor(
                                                                    player
                                                                        .fantasyPlayer
                                                                        .Position
                                                                )}`}
                                                            >
                                                                {
                                                                    player
                                                                        .fantasyPlayer
                                                                        .Position
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                DEF
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {player
                                                                .fantasyPlayer
                                                                ?.Name ||
                                                                `Defense (${player.playerId})`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                        {player.projectedPoints.toFixed(
                                                            2
                                                        )}{' '}
                                                        pts
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
