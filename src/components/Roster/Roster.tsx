import { useEffect, useState } from 'react';
import playerLibrary from '../../../node-script/players.json';

interface RosterData {
    players: string[];
}
interface RosterProps {
    leagueId: string;
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
export default function Roster({ leagueId }: RosterProps): JSX.Element {
    const [rosterData, setRosterData] = useState<RosterData[] | null>(null);
    // const [fantasyPlayerData, setFantasyPlayerData] = useState<FantasyPlayer[]>(
    //     []
    // );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fantasyPlayerLookup, setFantasyPlayerLookup] = useState<
        Record<string, FantasyPlayer>
    >({});

    // const [playerData, setPlayerData] = useState<PlayerMinimal[]>([]);

    // O(1) lookups instead of filtering/finding arrays
    // we will need this when we scale up as we wont have all playerIDs available in server
    const playerLookup: Record<string, PlayerInfo> = {};

    Object.values(playerLibrary).forEach((player) => {
        // console.log(player);
        playerLookup[player.player_id] = {
            full_name: player.full_name,
            fantasy_data_id: player.fantasy_data_id,
        };
    });

    // console.log(playerLookup, 'p lookup');
    useEffect(() => {
        const fetchRoster = async (): Promise<void> => {
            try {
                const rosterRes = await fetch(
                    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
                );
                if (!rosterRes.ok) throw new Error('rosters not found');
                const rosterFetchData =
                    (await rosterRes.json()) as RosterData[];
                setRosterData(rosterFetchData);
            } catch {
                console.log('error');
            }
        };
        fetchRoster();
    }, [leagueId]);
    useEffect(() => {
        const fetchPlayerFantasyData = async (): Promise<void> => {
            if (!rosterData) return;

            setLoading(true);
            setError(null);

            try {
                // Fetch all players from your server
                const res = await fetch('http://localhost:3000/api/players');

                if (!res.ok) {
                    throw new Error(`Error fetching players: ${res.status}`);
                }

                const allFantasyPlayers: FantasyPlayer[] = await res.json();

                // Filter fantasy players for matching IDs
                // not needed at this time but may be needed as scope increases
                // const rosterFantasyPlayers = allFantasyPlayers.filter(
                //     (fantasyPlayer) => {
                //         console.log(
                //             rosterData,
                //             'roster data and fantasy player',
                //             fantasyPlayer
                //         );

                //         return rosterData.players.includes(fantasyPlayer.ID);
                //     }
                // );
                // console.log('ALL', allFantasyPlayers);
                const lookup = allFantasyPlayers.reduce<
                    Record<string, FantasyPlayer>
                >((acc, player) => {
                    acc[player.ID] = player;
                    return acc;
                }, {});

                setFantasyPlayerLookup(lookup);

                // setFantasyPlayerData(allFantasyPlayers);
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                console.error('Error fetching fantasy data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerFantasyData();
    }, [rosterData]);
    return (
        <div>
            <h3>Each Roster</h3>

            {loading && <p>Loading fantasy data...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {rosterData &&
                rosterData.map((roster, i) => (
                    <div
                        key={i}
                        style={{
                            marginBottom: '20px',
                            border: '1px solid #ccc',
                            padding: '10px',
                        }}
                    >
                        <h4>Roster {i + 1}</h4>
                        <div>
                            {roster.players.map((playerId) => {
                                const playerIdStr = String(playerId);
                                // const playerIdNum = Number(playerId);
                                // O(1) lookups instead of filtering/finding arrays
                                // we will need this when we scale up as we wont have all playerIDs available in server
                                // const libraryPlayer = playerLookup[playerIdStr];
                                // console.log(playerLookup, 'lookup');
                                const fantasyPlayer =
                                    fantasyPlayerLookup[playerIdStr];

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
                                        {/* {!libraryPlayer && (
                                            <span
                                                style={{
                                                    marginLeft: '10px',
                                                    color: '#999',
                                                    fontSize: '0.8em',
                                                }}
                                            >
                                                (Not in library)
                                            </span>
                                        )} */}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
        </div>
    );
}
