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

    return (
        <div>
            {loading && <p>Loading fantasy data...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {rosterData &&
                rosterData.map((roster, i) => {
                    console.log(matchupRoster, i);
                    const matchupRosterNumber = Number(
                        matchupRoster.replace(/\D/g, '')
                    );

                    if (i + 1 !== matchupRosterNumber) return null; // skip non-matching roster

                    return (
                        <div
                            key={roster.roster_id}
                            style={{
                                marginBottom: '20px',
                                border: '1px solid #ccc',
                                padding: '10px',
                            }}
                        >
                            <h4>Roster {i + 1}</h4>
                            <div>
                                {roster.players.map((playerId) => {
                                    const fantasyPlayer =
                                        fantasyPlayerLookup[String(playerId)];

                                    return (
                                        <div
                                            key={playerId}
                                            style={{ marginBottom: '5px' }}
                                        >
                                            <strong>
                                                {fantasyPlayer?.Name ||
                                                    `Defense (${playerId})`}
                                            </strong>
                                            {fantasyPlayer && (
                                                <span
                                                    style={{
                                                        marginLeft: '10px',
                                                        color: '#000',
                                                    }}
                                                >
                                                    {fantasyPlayer.Position} -{' '}
                                                    {(
                                                        fantasyPlayer[
                                                            'Projected Points'
                                                        ] / 17
                                                    ).toFixed(2)}{' '}
                                                    pts
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
