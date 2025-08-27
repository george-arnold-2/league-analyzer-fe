import { useEffect, useState } from 'react';
import players from '../../../node-script/players.json';

interface RosterData {
    players: number[];
}
interface RosterProps {
    leagueId: string;
}
interface PlayerInfo {
    full_name: string;
    fantasy_data_id: string;
}
// interface PlayerMinimal {
//     player_id: string;
//     full_name: string;

// }
export default function Roster({ leagueId }: RosterProps): JSX.Element {
    const [rosterData, setRosterData] = useState<RosterData[] | null>(null);
    // const [playerData, setPlayerData] = useState<PlayerMinimal[]>([]);

    const playerLookup: Record<string, PlayerInfo> = {};
    Object.values(players).forEach((player) => {
        // console.log(player);
        playerLookup[player.player_id] = {
            full_name: player.full_name,
            fantasy_data_id: player.fantasy_data_id,
        };
    });

    console.log(playerLookup, 'p lookup');
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
            try {
                for (const playerId of rosterData) {
                    const res = await fetch(
                        `https://api.fantasydata.com/v3/nfl/stats/json/PlayerSeasonStatsByPlayerID/2025/${playerId}`,
                        {
                            headers: {
                                'Ocp-Apim-Subscription-Key': YOUR_API_KEY, // FantasyData requires this
                            },
                        }
                    );

                    if (!res.ok) {
                        throw new Error(
                            `Error fetching player ${playerId}: ${res.status}`
                        );
                    }

                    const data = await res.json();
                    console.log('Player:', playerId, data);
                }
            } catch (err) {
                console.error('Error fetching fantasy data:', err);
            }
        };

        if (rosterData?.length) {
            fetchPlayerFantasyData();
        }
    }, [rosterData]);
    return (
        <div>
            <h3>Each Roster</h3>
            {rosterData &&
                rosterData.map((roster, i) => (
                    <div key={i}>
                        <p> Roster {i + 1}</p>
                        <p>
                            {' '}
                            Players:{' '}
                            {roster.players
                                // || id gives us a fallback if the playerLookup doesn't contain the id
                                .map((id) => playerLookup[id].full_name || id)
                                .join(', ')}
                        </p>
                    </div>
                ))}
        </div>
    );
}
