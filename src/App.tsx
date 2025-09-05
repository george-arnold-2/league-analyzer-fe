import LeagueInput from './components/LeagueInput/LeagueInput';
import Schedule from './components/Schedule/Schedule';
import React, { useState, useEffect } from 'react';

export default function App(): React.JSX.Element {
    const [leagueId, setLeagueId] = useState<string>('');
    const [week, setWeek] = useState<number>(1);

    // Load saved values if they exist
    useEffect(() => {
        const savedLeagueId = sessionStorage.getItem('leagueId');
        const savedWeek = sessionStorage.getItem('week');

        if (savedLeagueId) {
            setLeagueId(savedLeagueId);
        }
        if (savedWeek) {
            setWeek(parseInt(savedWeek, 10));
        }
    }, []);

    // Save league ID to session storage when it changes
    useEffect(() => {
        if (leagueId) {
            sessionStorage.setItem('leagueId', leagueId);
        } else {
            sessionStorage.removeItem('leagueId');
        }
    }, [leagueId]);

    // Save week to session storage when it changes

    useEffect(() => {
        sessionStorage.setItem('week', week.toString());
    }, [week]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-green-500 text-gray-700 ">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                        Sleeper League Search
                    </h1>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-green-100 text-sm">
                            For testing purposes use:
                            <span className="font-mono bg-white/20 px-2 py-1 rounded ml-2">
                                1259966529118674944
                            </span>
                        </p>
                    </div>
                </div>

                {/* League Input Card */}
                <div className="bg-white rounded-xl shadow-xl p-6 mb-6 max-w-2xl mx-auto">
                    <LeagueInput
                        onLeagueSelect={(id) => setLeagueId(id)}
                        initialLeagueId={leagueId}
                    />
                </div>

                {/* Week Selector */}
                {leagueId && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6 max-w-md mx-auto">
                        <label className="block text-sm font-medium mb-2">
                            Select Week
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min={1}
                                max={18}
                                value={week}
                                onChange={(e) =>
                                    setWeek(Number(e.target.value))
                                }
                                className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                                placeholder="Enter week number"
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
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Section */}
                {leagueId && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        <Schedule leagueId={leagueId} week={week} />
                    </div>
                )}
            </div>

            {/* Background Pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>
        </div>
    );
}
