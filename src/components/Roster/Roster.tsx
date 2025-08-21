import { useEffect, useState } from 'react';
import players from '../../../node-script/players.json';

interface RosterData {
    players: number[];
}
interface RosterProps {
    leagueId: string;
}
// interface PlayerMinimal {
//     player_id: string;
//     full_name: string;
// }
export default function Roster({ leagueId }: RosterProps): JSX.Element {
    const [rosterData, setRosterData] = useState<RosterData[] | null>(null);
    // const [playerData, setPlayerData] = useState<PlayerMinimal[]>([]);

    const playerLookup: Record<string, string> = {};
    Object.values(players).forEach((player) => {
        playerLookup[player.player_id] = player.player_fullname;
    });
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
                console.log(rosterFetchData);
            } catch {
                console.log('error');
            }
        };
        fetchRoster();
    }, [leagueId]);
    useEffect(() => {
        console.log('rosterData updated:', rosterData);
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
                                .map((id) => playerLookup[id] || id)
                                .join(', ')}
                        </p>
                    </div>
                ))}
        </div>
    );
}
