import { useState } from 'react';

interface LeagueData {
    name: string;
    season: string;
    status: string;
}

interface LeagueInputProps {
    onLeagueSelect: (leagueId: string) => void;
}

export default function LeagueInput({
    onLeagueSelect,
}: LeagueInputProps): JSX.Element {
    const [leagueId, setLeagueId] = useState<string>('');
    const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const fetchLeague = async (): Promise<void> => {
        if (!leagueId.trim()) {
            setError('Please enter a league ID.');
            return;
        }

        setLoading(true);
        setError('');
        setLeagueData(null);

        try {
            const res = await fetch(
                `https://api.sleeper.app/v1/league/${leagueId}`
            );
            if (!res.ok) throw new Error('League not found');
            const data = (await res.json()) as LeagueData;
            setLeagueData(data);
            onLeagueSelect(leagueId); // Notify parent
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to fetch league data.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="league-input">
            <input
                type="text"
                placeholder="Enter League ID"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
            />
            <button onClick={fetchLeague}>Search</button>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {leagueData && (
                <div className="league-info">
                    <h2>{leagueData.name}</h2>
                    <p>Season: {leagueData.season}</p>
                    <p>Status: {leagueData.status}</p>
                </div>
            )}
        </div>
    );
}
