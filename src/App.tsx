// import statements get components from other files and the useState hook from react
import LeagueInput from './components/LeagueInput/LeagueInput';
import Schedule from './Schedule';
import React, { useState } from 'react';

export default function App(): React.JSX.Element {
    const [leagueId, setLeagueId] = useState<string>('');
    const [week, setWeek] = useState<number>(1);

    return (
        <div className="app">
            <h1>Sleeper League Search</h1>

            {/* Pass a callback to LeagueInput so it can set leagueId in App */}
            <LeagueInput onLeagueSelect={(id) => setLeagueId(id)} />

            <div style={{ marginTop: '2rem' }}>
                <label>
                    Week:{' '}
                    <input
                        type="number"
                        min={1}
                        max={18}
                        value={week}
                        onChange={(e) => setWeek(Number(e.target.value))}
                    />
                </label>
            </div>

            {leagueId && <Schedule leagueId={leagueId} week={week} />}
        </div>
    );
}
