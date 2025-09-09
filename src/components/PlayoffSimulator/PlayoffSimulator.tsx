import { useState } from 'react';

// Types for simulation data
interface SimulationResult {
    week: number;
    matchups: MatchupResult[];
}

interface MatchupResult {
    team1: string;
    team2: string;
    team1Wins: number;
    team2Wins: number;
    team1WinPercentage: number;
    team2WinPercentage: number;
}

interface TeamRecord {
    teamName: string;
    expectedWins: number;
    playoffOdds: number;
}

interface RosterData {
    roster_id: number;
    players: string[];
    owner_id: string;
    settings?: {
        wins: number;
        losses: number;
    };
}

interface UserData {
    user_id: string;
    display_name: string;
    metadata: {
        team_name: string;
    };
}

interface FantasyPlayer {
    Name: string;
    Position: string;
    projected_points: number;
    ID: string;
}

interface PlayoffSimulatorProps {
    leagueId: string;
    currentWeek: number;
    rosters: RosterData[] | null;
    users: UserData[] | null;
    fantasyPlayers: Record<string, FantasyPlayer>;
}

export default function PlayoffSimulator({
    leagueId,
    currentWeek,
    rosters,
    users,
    fantasyPlayers,
}: PlayoffSimulatorProps) {
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResults, setSimulationResults] = useState<{
        weekResults: SimulationResult[];
        playoffOdds: TeamRecord[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);


    // Get team name from roster ID
    const getTeamName = (
        rosterId: number,
        rostersData: RosterData[],
        usersData: UserData[]
    ): string => {
        const roster = rostersData.find((r) => r.roster_id === rosterId);
        if (!roster) return `Team ${rosterId}`;

        const user = usersData.find((u) => u.user_id === roster.owner_id);
        return user ? user.display_name : `Team ${rosterId}`;
    };

    // Random projection logic (same as existing code)
    const getRandomProjection = (base: number): string => {
        if (base <= 0) return '0.00';

        let result;

        if (Math.random() < 0.7) {
            const variance = 0.5 + Math.random();
            const direction = Math.random() < 0.5 ? -1 : 1;
            result = base + variance * direction;
        } else {
            const scale = Math.max(2, base / 2);
            const min = Math.max(0, base - scale);
            const max = Math.min(30, base + scale);
            result = min + Math.random() * (max - min);
        }

        result = Math.max(0, Math.min(30, result));
        return result.toFixed(2);
    };

    // Get starting lineup (similar to existing Roster component logic)
    const getStartingLineup = (
        playerIds: string[],
        playerLookup: Record<string, FantasyPlayer>
    ) => {
        const positionOrder = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'DEF', 'K'];

        const playersWithProjections = playerIds.map((playerId) => {
            const fantasyPlayer = playerLookup[playerId];
            return {
                playerId,
                fantasyPlayer,
                position: fantasyPlayer?.Position || 'DEF',
            };
        });

        // Group by position
        const playersByPosition = playersWithProjections.reduce(
            (acc, player) => {
                const pos = player.position;
                if (!acc[pos]) acc[pos] = [];
                acc[pos].push(player);
                return acc;
            },
            {} as Record<string, typeof playersWithProjections>
        );

        // Sort each position by base projection
        Object.keys(playersByPosition).forEach((pos) => {
            playersByPosition[pos].sort((a, b) => {
                const aProj = a.fantasyPlayer
                    ? fantasyPlayers[a.playerId].projected_points / 17
                    : 0;
                const bProj = b.fantasyPlayer
                    ? b.fantasyPlayer.projected_points / 17
                    : 0;
                return bProj - aProj;
            });
        });

        // Build starting lineup
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
    };

    // Calculate team score using random projections
    const calculateTeamScore = (
        playerIds: string[],
        playerLookup: Record<string, FantasyPlayer>
    ): number => {
        const startingLineup = getStartingLineup(playerIds, playerLookup);
        return startingLineup.reduce((total, player) => {
            const baseProjection = player.fantasyPlayer
                ? player.fantasyPlayer.projected_points / 17
                : 0;
            const randomProjection = getRandomProjection(baseProjection);
            return total + parseFloat(randomProjection);
        }, 0);
    };

    // Simulate a single matchup using random projections
    const simulateMatchup = (
        team1RosterId: number,
        team2RosterId: number,
        rostersData: RosterData[],
        playerLookup: Record<string, FantasyPlayer>
    ): { team1Score: number; team2Score: number } => {
        const team1Roster = rostersData.find((r) => r.roster_id === team1RosterId);
        const team2Roster = rostersData.find((r) => r.roster_id === team2RosterId);

        const team1Score = calculateTeamScore(
            team1Roster?.players || [],
            playerLookup
        );
        const team2Score = calculateTeamScore(
            team2Roster?.players || [],
            playerLookup
        );

        return { team1Score, team2Score };
    };

    // Get matchups for a specific week
    const getMatchupsForWeek = async (
        week: number
    ): Promise<Array<{ team1RosterId: number; team2RosterId: number }>> => {
        try {
            const res = await fetch(
                `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
            );
            const matchups = await res.json();

            // Group matchups by matchup_id
            const groupedMatchups = matchups.reduce(
                (acc: any, matchup: any) => {
                    if (!acc[matchup.matchup_id]) {
                        acc[matchup.matchup_id] = [];
                    }
                    acc[matchup.matchup_id].push(matchup);
                    return acc;
                },
                {}
            );

            // Convert to team pairs
            return Object.values(groupedMatchups).map((matchupPair: any) => ({
                team1RosterId: matchupPair[0].roster_id,
                team2RosterId: matchupPair[1].roster_id,
            }));
        } catch (error) {
            console.error(`Error fetching matchups for week ${week}:`, error);
            return [];
        }
    };

    // Probabilistic playoff odds calculation based on expected wins
    const calculatePlayoffOdds = (
        expectedWins: number,
        allTeamExpectedWins: Record<string, number>
    ): number => {
        const sortedExpectedWins = Object.values(allTeamExpectedWins).sort(
            (a, b) => b - a
        );
        const rank = sortedExpectedWins.indexOf(expectedWins) + 1;

        // Calculate odds based on expected wins and ranking
        // Teams with more expected wins have higher playoff odds
        const maxExpectedWins = Math.max(...sortedExpectedWins);
        const minExpectedWins = Math.min(...sortedExpectedWins);
        const range = maxExpectedWins - minExpectedWins;

        if (range === 0) return 50; // All teams equal

        // Normalize expected wins to 0-100 scale, with top 6 teams having higher base odds
        const normalizedScore = (expectedWins - minExpectedWins) / range;

        if (rank <= 6) {
            return Math.min(95, 60 + normalizedScore * 35);
        } else {
            return Math.max(5, normalizedScore * 40);
        }
    };

    // Main simulation function using probabilistic approach
    const runSeasonSimulation = async (
        rostersData: RosterData[],
        usersData: UserData[],
        playerLookup: Record<string, FantasyPlayer>
    ): Promise<{
        weekResults: SimulationResult[];
        playoffOdds: TeamRecord[];
    }> => {
        const weekResults: SimulationResult[] = [];
        const teamExpectedWins: Record<string, number> = {};
        const totalSimulations = 1000;

        // Initialize team expected win counters with current wins
        rostersData.forEach((roster) => {
            const teamName = getTeamName(roster.roster_id, rostersData, usersData);
            const currentWins = roster.settings?.wins || 0;
            teamExpectedWins[teamName] = currentWins;
        });

        // Run simulations for each remaining week
        for (let week = currentWeek; week <= 17; week++) {
            const matchups = await getMatchupsForWeek(week);
            const weekResult: SimulationResult = {
                week,
                matchups: [],
            };

            // For each matchup, run 1000 simulations
            for (const matchup of matchups) {
                let team1Wins = 0;
                let team2Wins = 0;

                for (let sim = 0; sim < totalSimulations; sim++) {
                    const result = simulateMatchup(
                        matchup.team1RosterId,
                        matchup.team2RosterId,
                        rostersData,
                        playerLookup
                    );
                    if (result.team1Score > result.team2Score) {
                        team1Wins++;
                    } else {
                        team2Wins++;
                    }
                }

                const team1Name = getTeamName(
                    matchup.team1RosterId,
                    rostersData,
                    usersData
                );
                const team2Name = getTeamName(
                    matchup.team2RosterId,
                    rostersData,
                    usersData
                );

                const team1WinPercentage = (team1Wins / totalSimulations) * 100;
                const team2WinPercentage = (team2Wins / totalSimulations) * 100;

                weekResult.matchups.push({
                    team1: team1Name,
                    team2: team2Name,
                    team1Wins,
                    team2Wins,
                    team1WinPercentage,
                    team2WinPercentage,
                });

                // Add expected wins based on win probability (not binary outcome)
                teamExpectedWins[team1Name] += team1WinPercentage / 100;
                teamExpectedWins[team2Name] += team2WinPercentage / 100;
            }

            weekResults.push(weekResult);
        }

        // Calculate playoff odds based on expected wins
        const playoffOdds = Object.entries(teamExpectedWins)
            .map(([teamName, expectedWins]) => ({
                teamName,
                expectedWins,
                playoffOdds: calculatePlayoffOdds(
                    expectedWins,
                    teamExpectedWins
                ),
            }))
            .sort((a, b) => b.expectedWins - a.expectedWins);

        return { weekResults, playoffOdds };
    };

    const runSimulation = async () => {
        if (!rosters || !users || !fantasyPlayers) {
            setError('League data not loaded');
            return;
        }

        setIsSimulating(true);
        setError(null);

        try {
            // Run the simulation with passed data
            const results = await runSeasonSimulation(
                rosters,
                users,
                fantasyPlayers
            );
            setSimulationResults(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Simulation failed');
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Playoff Simulator
                </h2>
                <p className="text-gray-600">
                    Run 1000 simulations for each remaining week to calculate
                    playoff odds
                </p>
            </div>

            {!simulationResults && (
                <button
                    onClick={runSimulation}
                    disabled={isSimulating}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors duration-200 ${
                        isSimulating
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                    }`}
                >
                    {isSimulating ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Running Simulations...
                        </div>
                    ) : (
                        'Run Playoff Simulation'
                    )}
                </button>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {simulationResults && (
                <div className="space-y-6">
                    {/* Playoff Odds Table */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4">
                            Playoff Odds
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                            Rank
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                            Team
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                            Expected Wins
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                            Playoff Odds
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {simulationResults.playoffOdds.map(
                                        (team, index) => (
                                            <tr
                                                key={team.teamName}
                                                className={
                                                    index < 6
                                                        ? 'bg-green-50'
                                                        : ''
                                                }
                                            >
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {team.teamName}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {team.expectedWins.toFixed(
                                                        1
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            team.playoffOdds >=
                                                            70
                                                                ? 'bg-green-100 text-green-800'
                                                                : team.playoffOdds >=
                                                                  30
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {team.playoffOdds.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Weekly Matchup Predictions */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4">
                            Weekly Matchup Predictions
                        </h3>
                        <div className="space-y-4">
                            {simulationResults.weekResults.map((weekResult) => (
                                <div
                                    key={weekResult.week}
                                    className="border border-gray-200 rounded-lg p-4"
                                >
                                    <h4 className="font-semibold mb-3">
                                        Week {weekResult.week}
                                    </h4>
                                    <div className="grid gap-3">
                                        {weekResult.matchups.map(
                                            (matchup, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <span className="font-medium">
                                                            {matchup.team1}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            vs
                                                        </span>
                                                        <span className="font-medium">
                                                            {matchup.team2}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-4 text-sm">
                                                        <span
                                                            className={`px-2 py-1 rounded ${
                                                                matchup.team1WinPercentage >
                                                                50
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {matchup.team1WinPercentage.toFixed(
                                                                1
                                                            )}
                                                            %
                                                        </span>
                                                        <span
                                                            className={`px-2 py-1 rounded ${
                                                                matchup.team2WinPercentage >
                                                                50
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {matchup.team2WinPercentage.toFixed(
                                                                1
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={() => setSimulationResults(null)}
                        className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                    >
                        Run New Simulation
                    </button>
                </div>
            )}
        </div>
    );
}
