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
    'Projected Points': number;
    ID: string;
}

interface SupabasePlayer {
    name: string;
    position: string;
    projected_points: number;
    player_id: string;
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
                    // Transform Supabase column names to expected format
                    acc[player.player_id] = {
                        ID: player.player_id,
                        Name: player.name,
                        Position: player.position,
                        'Projected Points': player.projected_points,
                    };
                    return acc;
                }, {});
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
