import { useState, useEffect } from 'react';

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

export default function Schedule({
    leagueId,
    week,
}: ScheduleProps): JSX.Element {
    const [matchups, setMatchups] = useState<Matchup[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchMatchups = async () => {
            if (!leagueId) {
                setError('No league ID provided.');
                setLoading(false);
                return;
            }

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
    }, [leagueId, week]); // Refetch if leagueId or week changes

    if (loading) return <p>Loading schedule...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className="schedule">
            <h2>Week {week} Matchups</h2>
            {matchups.length === 0 ? (
                <p>No matchups found.</p>
            ) : (
                <ul>
                    {Object.values(
                        matchups.reduce<
                            Record<
                                string,
                                { rosters: string[]; points: number[] }
                            >
                        >((acc, m) => {
                            if (!acc[m.matchup_id]) {
                                acc[m.matchup_id] = { rosters: [], points: [] };
                            }
                            acc[m.matchup_id].rosters.push(
                                `Roster ${m.roster_id}`
                            );
                            acc[m.matchup_id].points.push(m.points);
                            return acc;
                        }, {})
                    ).map((matchup, i) => (
                        <li key={i}>
                            {matchup.rosters.join(' vs ')} - Points:{' '}
                            {matchup.points.join(' / ')}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
