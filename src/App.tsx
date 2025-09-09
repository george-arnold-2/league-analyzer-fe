import LeagueInput from './components/LeagueInput/LeagueInput';
import Schedule from './components/Schedule/Schedule';
import PlayoffSimulator from './components/PlayoffSimulator/PlayoffSimulator';
import PlayoffMaps from './components/PlayoffMaps/PlayoffMaps';
import React, { useState, useEffect } from 'react';
import { useLeagueData } from './hooks/useLeagueData';

export default function App(): React.JSX.Element {
    const [leagueId, setLeagueId] = useState<string>('');
    const [week, setWeek] = useState<number>(2);
    const [activeTab, setActiveTab] = useState<
        'schedule' | 'playoffs' | 'maps'
    >('schedule');

    // Fetch shared league data once at the app level
    const {
        rosters,
        users,
        fantasyPlayers,
        loading: leagueDataLoading,
        error: leagueDataError,
    } = useLeagueData(leagueId);

    // Load saved values if they exist
    useEffect(() => {
        const savedLeagueId = sessionStorage.getItem('leagueId');
        const savedWeek = sessionStorage.getItem('week');
        const savedTab = sessionStorage.getItem('activeTab') as
            | 'schedule'
            | 'playoffs'
            | 'maps';

        if (savedLeagueId) {
            setLeagueId(savedLeagueId);
        }
        if (savedWeek) {
            setWeek(parseInt(savedWeek, 10));
        }
        if (savedTab) {
            setActiveTab(savedTab);
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

    // Save active tab to session storage when it changes
    useEffect(() => {
        sessionStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

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
                                1258107226489360384
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

                {/* Navigation Tabs */}
                {leagueId && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6 max-w-2xl mx-auto">
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'schedule'
                                        ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                Week by Week
                            </button>
                            <button
                                onClick={() => setActiveTab('playoffs')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'playoffs'
                                        ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                Playoff Simulator
                            </button>
                            <button
                                onClick={() => setActiveTab('maps')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'maps'
                                        ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                Playoff Maps
                            </button>
                        </div>

                        {/* Week Selector - only show for schedule tab */}
                        {activeTab === 'schedule' && (
                            <div>
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
                                        defaultValue={week}
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
                    </div>
                )}

                {/* Content Section */}
                {leagueId && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        {leagueDataLoading ? (
                            <div className="p-8">
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                    <span className="ml-3 text-lg text-gray-700">
                                        Loading league data...
                                    </span>
                                </div>
                            </div>
                        ) : leagueDataError ? (
                            <div className="p-6">
                                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                    <p className="text-red-700">
                                        {leagueDataError}
                                    </p>
                                </div>
                            </div>
                        ) : activeTab === 'schedule' ? (
                            <Schedule
                                leagueId={leagueId}
                                week={week}
                                rosters={rosters}
                                users={users}
                                fantasyPlayers={fantasyPlayers}
                            />
                        ) : activeTab === 'playoffs' ? (
                            <PlayoffSimulator
                                leagueId={leagueId}
                                currentWeek={week}
                                rosters={rosters}
                                users={users}
                                fantasyPlayers={fantasyPlayers}
                            />
                        ) : (
                            <PlayoffMaps
                                leagueId={leagueId}
                                currentWeek={week}
                            />
                        )}
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
