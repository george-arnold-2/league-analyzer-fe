import { useState, useEffect, useCallback } from 'react';

interface LeagueData {
    name: string;
    season: string;
    status: string;
}

interface LeagueInputProps {
    onLeagueSelect: (leagueId: string) => void;
    initialLeagueId?: string;
}

export default function LeagueInput({
    onLeagueSelect,
    initialLeagueId,
}: LeagueInputProps) {
    const [leagueId, setLeagueId] = useState<string>(initialLeagueId || '');
    const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const fetchLeagueData = useCallback(
        async (id: string): Promise<void> => {
            setLoading(true);
            setError('');
            setLeagueData(null);

            try {
                const leagueRes = await fetch(
                    `https://api.sleeper.app/v1/league/${id}`
                );
                if (!leagueRes.ok) throw new Error('League not found');
                const leagueFetchData = (await leagueRes.json()) as LeagueData;
                setLeagueData(leagueFetchData);

                onLeagueSelect(id);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Failed to fetch league data.');
                }
            } finally {
                setLoading(false);
            }
        },
        [onLeagueSelect]
    );

    // Auto-fetch league data when initialLeagueId is provided
    useEffect(() => {
        if (initialLeagueId && initialLeagueId !== leagueId) {
            setLeagueId(initialLeagueId);
            fetchLeagueData(initialLeagueId);
        }
    }, [initialLeagueId, leagueId, fetchLeagueData]);

    const fetchLeague = async (): Promise<void> => {
        if (!leagueId.trim()) {
            setError('Please enter a league ID.');
            return;
        }

        await fetchLeagueData(leagueId);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            fetchLeague();
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">
                    League ID
                </label>
                <div className="flex space-x-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Enter League ID"
                            value={leagueId}
                            onChange={(e) => setLeagueId(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                            disabled={loading}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={fetchLeague}
                        disabled={loading || !leagueId.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Searching...</span>
                            </>
                        ) : (
                            <>
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <span>Search</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
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
            )}

            {leagueData && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-green-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-semibold text-green-800 mb-2">
                                {leagueData.name}
                            </h3>
                            <div className="space-y-1">
                                <p className="text-sm text-green-700">
                                    <span className="font-medium">Season:</span>{' '}
                                    {leagueData.season}
                                </p>
                                <p className="text-sm text-green-700">
                                    <span className="font-medium">Status:</span>
                                    <span
                                        className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            leagueData.status === 'in_season'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        {leagueData.status.replace('_', ' ')}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
