import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

interface RosterData {
    roster_id: number;
    players: string[];
    owner_id: string;
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

interface SupabasePlayer {
    name: string;
    position: string;
    projected_points: number;
    player_id: string | number;
}

interface LeagueData {
    rosters: RosterData[] | null;
    users: UserData[] | null;
    fantasyPlayers: Record<string, FantasyPlayer>;
    loading: boolean;
    error: string | null;
}

export function useLeagueData(leagueId: string): LeagueData {
    const [rosters, setRosters] = useState<RosterData[] | null>(null);
    const [users, setUsers] = useState<UserData[] | null>(null);
    const [fantasyPlayers, setFantasyPlayers] = useState<
        Record<string, FantasyPlayer>
    >({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!leagueId) {
            setRosters(null);
            setUsers(null);
            setFantasyPlayers({});
            setError(null);
            return;
        }

        const fetchLeagueData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch all data in parallel

                // Query for Brock Bowers by name to see what ID he has in Supabase
                const brockBowersQuery = await supabase
                    .from('fantasy_data')
                    .select('*')
                    .ilike('name', '%Brock Bowers%');

                console.log('Brock Bowers specific query:', brockBowersQuery);

                // Also check a few sample players to understand the ID pattern
                // const samplePlayersQuery = await supabase
                //     .from('fantasy_data')
                //     .select('player_id, name, position')
                //     .limit(40);

                // console.log(
                //     'Sample players from Supabase:',
                //     samplePlayersQuery
                // );

                const [rostersRes, usersRes, fantasyData] = await Promise.all([
                    fetch(
                        `https://api.sleeper.app/v1/league/${leagueId}/rosters`
                    ),
                    fetch(
                        `https://api.sleeper.app/v1/league/${leagueId}/users`
                    ),
                    supabase
                        .from('fantasy_data')
                        .select('player_id, name, position, projected_points'),
                ]);
                console.log('rostersRes', rostersRes);
                console.log('usersRes', usersRes);
                console.log('fantasyData', fantasyData);
                console.log('fantasyData', fantasyData.data);

                // Handle rosters
                if (!rostersRes.ok) throw new Error('Failed to fetch rosters');
                const rostersData = (await rostersRes.json()) as RosterData[];
                setRosters(rostersData);

                // Handle users
                if (!usersRes.ok) throw new Error('Failed to fetch users');
                const usersData = (await usersRes.json()) as UserData[];
                setUsers(usersData);

                // Handle fantasy players
                if (fantasyData.error) {
                    throw new Error(
                        `Error fetching fantasy data: ${fantasyData.error.message}`
                    );
                }

                const fantasyLookup = (fantasyData.data || []).reduce<
                    Record<string, FantasyPlayer>
                >((acc, player: SupabasePlayer) => {
                    // Convert player_id to string to ensure consistent lookup
                    const playerIdString = String(player.player_id);
                    console.log(playerIdString, 'playerIdString');
                    // Transform Supabase column names to expected format
                    acc[playerIdString] = {
                        ID: playerIdString,
                        Name: player.name,
                        Position: player.position,
                        projected_points: player.projected_points,
                    };

                    // Debug Brock Bowers specifically
                    if (
                        playerIdString === '11604' ||
                        player.name.includes('Brock Bowers')
                    ) {
                        console.log('Found Brock Bowers in Supabase:', {
                            original_player_id: player.player_id,
                            converted_player_id: playerIdString,
                            name: player.name,
                            projected_points: player.projected_points,
                            transformedData: acc[playerIdString],
                        });
                    }

                    return acc;
                }, {});

                console.log(
                    'Fantasy lookup created with',
                    Object.keys(fantasyLookup).length,
                    'players'
                );
                console.log(
                    'Sample player IDs:',
                    Object.keys(fantasyLookup).slice(0, 10)
                );

                setFantasyPlayers(fantasyLookup);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Unknown error';
                setError(message);
                console.error('Error fetching league data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeagueData();
    }, [leagueId]);

    return {
        rosters,
        users,
        fantasyPlayers,
        loading,
        error,
    };
}
