import { supabase } from '../config/supabaseClient';

interface SleeperPlayer {
    player_id: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    fantasy_positions?: string[];
    active?: boolean;
    position?: string;
}

interface FantasyPlayer {
    ID: string;
    Name: string;
    Position: string;
    'Projected Points': number;
}

export async function populateFantasyData(): Promise<void> {
    try {
        console.log('🔄 Fetching player data from Sleeper API...');
        
        // Fetch fresh player data from Sleeper API
        const response = await fetch('https://api.sleeper.app/v1/players/nfl');
        if (!response.ok) {
            throw new Error('Failed to fetch player data from Sleeper');
        }
        
        const playersData: Record<string, SleeperPlayer> = await response.json();
        
        // Transform the data to match the expected format
        const fantasyPlayers: FantasyPlayer[] = [];
        
        for (const [playerId, player] of Object.entries(playersData)) {
            // Only include active players with fantasy positions
            if (player.active && player.fantasy_positions && player.fantasy_positions.length > 0) {
                // Generate a basic projected points value
                let projectedPoints = 0;
                const position = player.fantasy_positions[0]; // Use primary position
                
                // Basic projection based on position (season total for 17 weeks)
                switch (position) {
                    case 'QB':
                        projectedPoints = Math.random() * 425 + 255; // 255-680 points (15-40 per week)
                        break;
                    case 'RB':
                        projectedPoints = Math.random() * 340 + 136; // 136-476 points (8-28 per week)
                        break;
                    case 'WR':
                        projectedPoints = Math.random() * 306 + 102; // 102-408 points (6-24 per week)
                        break;
                    case 'TE':
                        projectedPoints = Math.random() * 255 + 68; // 68-323 points (4-19 per week)
                        break;
                    case 'K':
                        projectedPoints = Math.random() * 170 + 85; // 85-255 points (5-15 per week)
                        break;
                    case 'DEF':
                        projectedPoints = Math.random() * 204 + 51; // 51-255 points (3-15 per week)
                        break;
                    default:
                        projectedPoints = Math.random() * 136 + 34; // 34-170 points (2-10 per week)
                }
                
                fantasyPlayers.push({
                    ID: playerId,
                    Name: player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim(),
                    Position: position,
                    'Projected Points': Math.round(projectedPoints * 100) / 100
                });
            }
        }
        
        console.log(`🔄 Preparing to insert ${fantasyPlayers.length} players...`);
        
        // Clear existing data first
        console.log('🗑️ Clearing existing fantasy_data...');
        const { error: deleteError } = await supabase
            .from('fantasy_data')
            .delete()
            .neq('ID', ''); // Delete all records
            
        if (deleteError && !deleteError.message.includes('No rows found')) {
            console.warn('Could not clear existing data:', deleteError.message);
        }
        
        // Insert data in batches (Supabase has limits)
        const batchSize = 1000;
        let inserted = 0;
        
        for (let i = 0; i < fantasyPlayers.length; i += batchSize) {
            const batch = fantasyPlayers.slice(i, i + batchSize);
            
            console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fantasyPlayers.length / batchSize)} (${batch.length} players)...`);
            
            const { error } = await supabase
                .from('fantasy_data')
                .insert(batch);
                
            if (error) {
                console.error('❌ Error inserting batch:', error);
                throw error;
            }
            
            inserted += batch.length;
            console.log(`✅ Inserted ${inserted}/${fantasyPlayers.length} players`);
        }
        
        console.log(`🎉 Successfully populated fantasy_data table with ${inserted} players!`);
        
        // Verify the data
        const { data: verifyData, error: verifyError, count } = await supabase
            .from('fantasy_data')
            .select('*', { count: 'exact' })
            .limit(5);
            
        if (verifyError) {
            console.error('❌ Error verifying data:', verifyError);
        } else {
            console.log(`✅ Verification: ${count} total records in fantasy_data table`);
            console.log('Sample records:', verifyData);
        }
        
    } catch (error) {
        console.error('❌ Error populating fantasy data:', error);
        throw error;
    }
}
