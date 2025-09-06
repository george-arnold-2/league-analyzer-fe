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
    wins: number;
    losses: number;
    playoffOdds: number;
}

interface PlayoffSimulatorProps {
    leagueId: string;
    currentWeek: number;
}

export default function PlayoffSimulator({ leagueId, currentWeek }: PlayoffSimulatorProps) {
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResults, setSimulationResults] = useState<{
        weekResults: SimulationResult[];
        playoffOdds: TeamRecord[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // State to hold data needed for simulations
    const [rosterData, setRosterData] = useState<any[]>([]);
    const [userData, setUserData] = useState<any[]>([]);
    const [fantasyPlayerLookup, setFantasyPlayerLookup] = useState<Record<string, any>>({});

    // Fetch roster data from Sleeper API
    const fetchRosterData = async () => {
        const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
        const data = await res.json();
        setRosterData(data);
        return data;
    };

    // Fetch user data from Sleeper API
    const fetchUserData = async () => {
        const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
        const data = await res.json();
        setUserData(data);
        return data;
    };

    // Fetch fantasy player data
    const fetchFantasyPlayerData = async () => {
        const res = await fetch('http://localhost:4000/api/players');
        const allFantasyPlayers = await res.json();
        
        const lookup = allFantasyPlayers.reduce((acc: any, player: any) => {
            acc[player.ID] = player;
            return acc;
        }, {});
        
        setFantasyPlayerLookup(lookup);
        return lookup;
    };

    // Get team name from roster ID
    const getTeamName = (rosterId: number, rosters: any[], users: any[]): string => {
        const roster = rosters.find(r => r.roster_id === rosterId);
        if (!roster) return `Team ${rosterId}`;
        
        const user = users.find(u => u.user_id === roster.owner_id);
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
    const getStartingLineup = (playerIds: string[], playerLookup: Record<string, any>) => {
        const positionOrder = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'DEF', 'K'];
        
        const playersWithProjections = playerIds.map(playerId => {
            const fantasyPlayer = playerLookup[playerId];
            return {
                playerId,
                fantasyPlayer,
                position: fantasyPlayer?.Position || 'DEF',
            };
        });

        // Group by position
        const playersByPosition = playersWithProjections.reduce((acc, player) => {
            const pos = player.position;
            if (!acc[pos]) acc[pos] = [];
            acc[pos].push(player);
            return acc;
        }, {} as Record<string, typeof playersWithProjections>);

        // Sort each position by base projection
        Object.keys(playersByPosition).forEach(pos => {
            playersByPosition[pos].sort((a, b) => {
                const aProj = a.fantasyPlayer ? a.fantasyPlayer['Projected Points'] : 0;
                const bProj = b.fantasyPlayer ? b.fantasyPlayer['Projected Points'] : 0;
                return bProj - aProj;
            });
        });

        // Build starting lineup
        const startingLineup: typeof playersWithProjections = [];
        const positionCounts: Record<string, number> = {};

        positionOrder.forEach(pos => {
            const count = positionCounts[pos] || 0;
            positionCounts[pos] = count + 1;

            if (playersByPosition[pos] && playersByPosition[pos][count]) {
                startingLineup.push(playersByPosition[pos][count]);
            }
        });

        return startingLineup;
    };

    // Calculate team score using random projections
    const calculateTeamScore = (playerIds: string[], playerLookup: Record<string, any>): number => {
        const startingLineup = getStartingLineup(playerIds, playerLookup);
        return startingLineup.reduce((total, player) => {
            const baseProjection = player.fantasyPlayer ? player.fantasyPlayer['Projected Points'] / 17 : 0;
            const randomProjection = getRandomProjection(baseProjection);
            return total + parseFloat(randomProjection);
        }, 0);
    };

    // Simulate a single matchup using random projections
    const simulateMatchup = (team1RosterId: number, team2RosterId: number, rosters: any[], playerLookup: Record<string, any>): { team1Score: number, team2Score: number } => {
        const team1Roster = rosters.find(r => r.roster_id === team1RosterId);
        const team2Roster = rosters.find(r => r.roster_id === team2RosterId);

        const team1Score = calculateTeamScore(team1Roster?.players || [], playerLookup);
        const team2Score = calculateTeamScore(team2Roster?.players || [], playerLookup);

        return { team1Score, team2Score };
    };

    // Get matchups for a specific week
    const getMatchupsForWeek = async (week: number): Promise<Array<{ team1RosterId: number, team2RosterId: number }>> => {
        try {
            const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
            const matchups = await res.json();

            // Group matchups by matchup_id
            const groupedMatchups = matchups.reduce((acc: any, matchup: any) => {
                if (!acc[matchup.matchup_id]) {
                    acc[matchup.matchup_id] = [];
                }
                acc[matchup.matchup_id].push(matchup);
                return acc;
            }, {});

            // Convert to team pairs
            return Object.values(groupedMatchups).map((matchupPair: any) => ({
                team1RosterId: matchupPair[0].roster_id,
                team2RosterId: matchupPair[1].roster_id
            }));
        } catch (error) {
            console.error(`Error fetching matchups for week ${week}:`, error);
            return [];
        }
    };

    // Simple playoff odds calculation
    const calculatePlayoffOdds = (wins: number, allTeamWins: Record<string, number>): number => {
        const sortedWins = Object.values(allTeamWins).sort((a, b) => b - a);
        const rank = sortedWins.indexOf(wins) + 1;
        
        // Simple calculation: top 6 teams make playoffs
        if (rank <= 6) {
            return Math.max(50, 100 - (rank - 1) * 10);
        } else {
            return Math.max(0, 50 - (rank - 6) * 10);
        }
    };

    // Main simulation function
    const runSeasonSimulation = async (rosters: any[], users: any[], playerLookup: Record<string, any>): Promise<{ weekResults: SimulationResult[], playoffOdds: TeamRecord[] }> => {
        const weekResults: SimulationResult[] = [];
        const teamWins: Record<string, number> = {};
        const totalSimulations = 1000;

        // Initialize team win counters
        rosters.forEach(roster => {
            const teamName = getTeamName(roster.roster_id, rosters, users);
            teamWins[teamName] = 0;
        });

        // Run simulations for each remaining week
        for (let week = currentWeek; week <= 17; week++) {
            const matchups = await getMatchupsForWeek(week);
            const weekResult: SimulationResult = {
                week,
                matchups: []
            };

            // For each matchup, run 1000 simulations
            for (const matchup of matchups) {
                let team1Wins = 0;
                let team2Wins = 0;

                for (let sim = 0; sim < totalSimulations; sim++) {
                    const result = simulateMatchup(matchup.team1RosterId, matchup.team2RosterId, rosters, playerLookup);
                    if (result.team1Score > result.team2Score) {
                        team1Wins++;
                    } else {
                        team2Wins++;
                    }
                }

                const team1Name = getTeamName(matchup.team1RosterId, rosters, users);
                const team2Name = getTeamName(matchup.team2RosterId, rosters, users);

                weekResult.matchups.push({
                    team1: team1Name,
                    team2: team2Name,
                    team1Wins,
                    team2Wins,
                    team1WinPercentage: (team1Wins / totalSimulations) * 100,
                    team2WinPercentage: (team2Wins / totalSimulations) * 100
                });

                // Add to season totals (using most likely winner)
                if (team1Wins > team2Wins) {
                    teamWins[team1Name]++;
                } else {
                    teamWins[team2Name]++;
                }
            }

            weekResults.push(weekResult);
        }

        // Calculate playoff odds (top 6 teams make playoffs in most leagues)
        const playoffOdds = Object.entries(teamWins).map(([teamName, wins]) => ({
            teamName,
            wins,
            losses: (17 - currentWeek + 1) - wins,
            playoffOdds: calculatePlayoffOdds(wins, teamWins)
        })).sort((a, b) => b.wins - a.wins);

        return { weekResults, playoffOdds };
    };

    const runSimulation = async () => {
        setIsSimulating(true);
        setError(null);

        try {
            // Fetch all data needed for simulation
            const [rosters, users, playerLookup] = await Promise.all([
                fetchRosterData(),
                fetchUserData(),
                fetchFantasyPlayerData()
            ]);

            // Run the simulation
            const results = await runSeasonSimulation(rosters, users, playerLookup);
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Playoff Simulator</h2>
                <p className="text-gray-600">
                    Run 1000 simulations for each remaining week to calculate playoff odds
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
                        <h3 className="text-xl font-semibold mb-4">Playoff Odds</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Rank</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Team</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Projected Record</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Playoff Odds</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {simulationResults.playoffOdds.map((team, index) => (
                                        <tr key={team.teamName} className={index < 6 ? 'bg-green-50' : ''}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.teamName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{team.wins}-{team.losses}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    team.playoffOdds >= 70 ? 'bg-green-100 text-green-800' :
                                                    team.playoffOdds >= 30 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {team.playoffOdds.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Weekly Matchup Predictions */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4">Weekly Matchup Predictions</h3>
                        <div className="space-y-4">
                            {simulationResults.weekResults.map(weekResult => (
                                <div key={weekResult.week} className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="font-semibold mb-3">Week {weekResult.week}</h4>
                                    <div className="grid gap-3">
                                        {weekResult.matchups.map((matchup, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                <div className="flex items-center space-x-4">
                                                    <span className="font-medium">{matchup.team1}</span>
                                                    <span className="text-gray-500">vs</span>
                                                    <span className="font-medium">{matchup.team2}</span>
                                                </div>
                                                <div className="flex items-center space-x-4 text-sm">
                                                    <span className={`px-2 py-1 rounded ${
                                                        matchup.team1WinPercentage > 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {matchup.team1WinPercentage.toFixed(1)}%
                                                    </span>
                                                    <span className={`px-2 py-1 rounded ${
                                                        matchup.team2WinPercentage > 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {matchup.team2WinPercentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
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
