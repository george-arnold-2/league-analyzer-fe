import { useState, useEffect } from 'react';

interface Owner {
    user_id: string;
    display_name: string;
    roster_id: number;
    wins: number;
    losses: number;
}

interface Matchup {
    week: number;
    opponent: string;
    winProbability: number;
    isWin?: boolean;
    isLoss?: boolean;
}

interface PlayoffMapsProps {
    leagueId: string;
    currentWeek: number;
}

export default function PlayoffMaps({
    leagueId,
    currentWeek,
}: PlayoffMapsProps) {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
    const [matchups, setMatchups] = useState<Matchup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch owners and rosters
    useEffect(() => {
        const fetchOwners = async () => {
            try {
                const [rostersRes, usersRes] = await Promise.all([
                    fetch(
                        `https://api.sleeper.app/v1/league/${leagueId}/rosters`
                    ),
                    fetch(
                        `https://api.sleeper.app/v1/league/${leagueId}/users`
                    ),
                ]);

                const rosters = await rostersRes.json();
                const users = await usersRes.json();

                const ownersData = rosters.map((roster: any) => {
                    const user = users.find(
                        (u: any) => u.user_id === roster.owner_id
                    );
                    return {
                        user_id: roster.owner_id,
                        display_name:
                            user?.display_name || `Team ${roster.roster_id}`,
                        roster_id: roster.roster_id,
                        wins: roster.settings?.wins || 0,
                        losses: roster.settings?.losses || 0,
                    };
                });

                setOwners(ownersData);
            } catch (err) {
                setError('Failed to fetch league data');
            }
        };

        if (leagueId) {
            fetchOwners();
        }
    }, [leagueId]);

    // Generate matchup map for selected owner
    const generateMatchupMap = async (owner: Owner) => {
        setLoading(true);
        setError(null);

        try {
            const matchupsData: Matchup[] = [];

            // Fetch matchups for remaining weeks
            for (let week = currentWeek; week <= 17; week++) {
                const res = await fetch(
                    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
                );
                const weekMatchups = await res.json();

                // Find this owner's matchup for the week
                const ownerMatchup = weekMatchups.find(
                    (m: any) => m.roster_id === owner.roster_id
                );
                if (ownerMatchup) {
                    // Find opponent
                    const opponentMatchup = weekMatchups.find(
                        (m: any) =>
                            m.matchup_id === ownerMatchup.matchup_id &&
                            m.roster_id !== owner.roster_id
                    );

                    if (opponentMatchup) {
                        const opponent = owners.find(
                            (o) => o.roster_id === opponentMatchup.roster_id
                        );

                        matchupsData.push({
                            week,
                            opponent:
                                opponent?.display_name ||
                                `Team ${opponentMatchup.roster_id}`,
                            winProbability: Math.random() * 40 + 30, // Random 30-70% for now
                            // TODO: Add actual win/loss data from completed games
                        });
                    }
                }
            }

            setMatchups(matchupsData);
        } catch (err) {
            setError('Failed to generate matchup map');
        } finally {
            setLoading(false);
        }
    };

    const handleOwnerSelect = (ownerId: string) => {
        const owner = owners.find((o) => o.user_id === ownerId);
        if (owner) {
            setSelectedOwner(owner);
            generateMatchupMap(owner);
        }
    };

    // Calculate playoff scenarios with proper league-wide analysis
    const calculatePlayoffScenarios = () => {
        if (!matchups.length) return null;

        const scenarios = [];
        const totalGames = matchups.length;
        const currentWins = selectedOwner?.wins || 0;

        for (
            let additionalWins = 0;
            additionalWins <= totalGames;
            additionalWins++
        ) {
            const totalWins = currentWins + additionalWins;
            const probability = calculateWinProbability(additionalWins);
            const playoffOdds = calculatePlayoffOdds(totalWins);

            scenarios.push({
                wins: additionalWins,
                totalWins,
                probability: probability * 100,
                playoffOdds,
                makesPlayoffs: playoffOdds > 50,
            });
        }

        return scenarios.sort((a, b) => b.wins - a.wins);
    };

    // Calculate probability of winning exactly N additional games using binomial distribution
    const calculateWinProbability = (targetWins: number) => {
        if (!matchups.length) return 0;

        const n = matchups.length;
        if (targetWins > n) return 0;

        // Use individual game probabilities for more accurate calculation
        const gameProbs = matchups.map((m) => m.winProbability / 100);

        // For simplicity, use average probability with binomial distribution
        const avgProb = gameProbs.reduce((sum, p) => sum + p, 0) / n;

        // Binomial coefficient
        const binomialCoeff =
            factorial(n) / (factorial(targetWins) * factorial(n - targetWins));

        // Binomial probability
        return (
            binomialCoeff *
            Math.pow(avgProb, targetWins) *
            Math.pow(1 - avgProb, n - targetWins)
        );
    };

    // Helper function for factorial
    const factorial = (n: number): number => {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    };

    // Calculate playoff odds based on final win total and league competition
    const calculatePlayoffOdds = (finalWins: number): number => {
        if (!owners.length) return 0;

        // Calculate remaining weeks in season
        const remainingWeeks = 18 - currentWeek; // Assuming 18 week season

        // Estimate how many teams will finish with fewer wins than finalWins
        // This is a simplified model - in reality we'd simulate all remaining games
        let teamsWithFewerWins = 0;

        owners.forEach((owner) => {
            if (owner.roster_id === selectedOwner?.roster_id) return; // Skip selected owner

            // Estimate this team's final wins (current wins + expected wins from remaining games)
            const currentWins = owner.wins;
            const expectedAdditionalWins = remainingWeeks * 0.5; // Assume 50% win rate
            const estimatedFinalWins = currentWins + expectedAdditionalWins;

            if (estimatedFinalWins < finalWins) {
                teamsWithFewerWins++;
            }
        });

        // Playoff spots (typically 6 teams make playoffs in 12-team league)
        const playoffSpots = Math.ceil(owners.length / 2);

        // If this team would rank in top playoff spots, calculate probability
        if (teamsWithFewerWins >= owners.length - playoffSpots) {
            return Math.min(
                95,
                60 + (teamsWithFewerWins - (owners.length - playoffSpots)) * 10
            );
        } else {
            // Lower probability based on how far from playoff cutoff
            const spotsFromPlayoffs =
                owners.length - playoffSpots - teamsWithFewerWins;
            return Math.max(1, 40 - spotsFromPlayoffs * 15);
        }
    };

    const scenarios = calculatePlayoffScenarios();

    return (
        <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Playoff Maps
                </h2>
                <p className="text-gray-600">
                    Select an owner to see their path to the playoffs
                </p>
            </div>

            {/* Owner Dropdown */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Owner
                </label>
                <select
                    value={selectedOwner?.user_id || ''}
                    onChange={(e) => handleOwnerSelect(e.target.value)}
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                >
                    <option value="">Choose an owner...</option>
                    {owners.map((owner) => (
                        <option key={owner.user_id} value={owner.user_id}>
                            {owner.display_name}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-2 text-gray-600">
                        Loading matchup map...
                    </span>
                </div>
            )}

            {selectedOwner && matchups.length > 0 && !loading && (
                <div className="space-y-6">
                    {/* Current Record */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-2">
                            {selectedOwner.display_name}
                        </h3>
                        <p className="text-gray-600">
                            Current Record: {selectedOwner.wins}-
                            {selectedOwner.losses} (Week {currentWeek})
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {selectedOwner.wins >= 10
                                ? 'Strong playoff position'
                                : selectedOwner.wins >= 7
                                ? 'In playoff contention'
                                : `Need ${Math.max(
                                      0,
                                      8 - selectedOwner.wins
                                  )} more wins for playoff contention`}
                        </p>
                    </div>

                    {/* Remaining Matchups */}
                    <div>
                        <h4 className="text-lg font-semibold mb-4">
                            Remaining Schedule
                        </h4>
                        <div className="space-y-3">
                            {matchups.map((matchup, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm font-medium text-gray-500">
                                            Week {matchup.week}
                                        </span>
                                        <span className="font-medium">
                                            vs {matchup.opponent}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                matchup.winProbability >= 60
                                                    ? 'bg-green-100 text-green-800'
                                                    : matchup.winProbability >=
                                                      40
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {matchup.winProbability.toFixed(0)}%
                                            win chance
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Playoff Scenarios */}
                    {scenarios && (
                        <div>
                            <h4 className="text-lg font-semibold mb-4">
                                Playoff Scenarios
                            </h4>
                            <div className="grid gap-3">
                                {scenarios
                                    .filter((s) => s.probability > 0.1)
                                    .map((scenario, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border-2 ${
                                                scenario.makesPlayoffs
                                                    ? 'border-green-200 bg-green-50'
                                                    : 'border-red-200 bg-red-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        Win {scenario.wins} of{' '}
                                                        {matchups.length}{' '}
                                                        remaining games
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        Final record:{' '}
                                                        {scenario.totalWins}-
                                                        {17 -
                                                            scenario.totalWins}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-600">
                                                            {scenario.probability.toFixed(
                                                                1
                                                            )}
                                                            % chance
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            of this outcome
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div
                                                            className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                                                scenario.playoffOdds >=
                                                                70
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : scenario.playoffOdds >=
                                                                      30
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {
                                                                scenario.playoffOdds
                                                            }
                                                            % playoffs
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
