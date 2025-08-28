import { useEffect, useState, useMemo } from 'react';
import playerLibrary from '../../../node-script/players.json';

interface RosterData {
    roster_id: number;
    players: string[];
}

interface RosterProps {
    leagueId: string;
    matchupRoster: string;
}

interface PlayerInfo {
    full_name: string;
    fantasy_data_id: string;
}

interface FantasyPlayer {
    Name: string;
    Position: string;
    'Projected Points': number;
    ID: string;
}

export default function Roster({
    leagueId,
    matchupRoster,
}: RosterProps): JSX.Element {
    const [rosterData, setRosterData] = useState<RosterData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fantasyPlayerLookup, setFantasyPlayerLookup] = useState<
        Record<string, FantasyPlayer>
    >({});

    // Memoized player lookup from static JSON
    const playerLookup = useMemo(() => {
        const lookup: Record<string, PlayerInfo> = {};
        Object.values(playerLibrary).forEach((player) => {
            lookup[player.player_id] = {
                full_name: player.full_name,
                fantasy_data_id: player.fantasy_data_id,
            };
        });
        return lookup;
    }, []);

    // Fetch roster data from Sleeper API
    useEffect(() => {
        const fetchRoster = async (): Promise<void> => {
            try {
                const res = await fetch(
                    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
                );
                if (!res.ok) throw new Error('Rosters not found');
                const data = (await res.json()) as RosterData[];
                setRosterData(data);
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : 'Unknown error';
                setError(msg);
                console.error('Error fetching rosters:', err);
            }
        };
        fetchRoster();
    }, [leagueId]);

    // Fetch fantasy player data
    useEffect(() => {
        const fetchPlayerFantasyData = async (): Promise<void> => {
            if (!rosterData) return;

            setLoading(true);
            setError(null);

            try {
                const res = await fetch('http://localhost:3000/api/players');
                if (!res.ok)
                    throw new Error(`Error fetching players: ${res.status}`);
                const allFantasyPlayers: FantasyPlayer[] = await res.json();

                const lookup = allFantasyPlayers.reduce<
                    Record<string, FantasyPlayer>
                >((acc, player) => {
                    acc[player.ID] = player;
                    return acc;
                }, {});

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

                    return (
                        <div
                            key={roster.roster_id}
                            className="bg-white rounded-lg shadow-md border border-green-200 overflow-hidden mb-4"
                        >
                            <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-400 px-4 py-3">
                                <h4 className="text-lg font-semibold text-white">
                                    Roster {i + 1}
                                </h4>
                            </div>

                            <div className="p-4">
                                <div className="space-y-3">
                                    {roster.players.map((playerId) => {
                                        const fantasyPlayer =
                                            fantasyPlayerLookup[
                                                String(playerId)
                                            ];
                                        const projectedPoints = fantasyPlayer
                                            ? (
                                                  fantasyPlayer[
                                                      'Projected Points'
                                                  ] / 17
                                              ).toFixed(2)
                                            : '0.00';

                                        return (
                                            <div
                                                key={playerId}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        {fantasyPlayer ? (
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionColor(
                                                                    fantasyPlayer.Position
                                                                )}`}
                                                            >
                                                                {
                                                                    fantasyPlayer.Position
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
                                                            {fantasyPlayer?.Name ||
                                                                `Defense (${playerId})`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                        {projectedPoints} pts
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
