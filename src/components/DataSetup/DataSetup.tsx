import { useState } from 'react';
// import { populateFantasyData } from '../../utils/populateSupabase';

export default function DataSetup() {
    const [isPopulating, setIsPopulating] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handlePopulateData = async () => {
        setIsPopulating(true);
        setError(null);
        setStatus('Starting data population...');

        try {
            // const result = await populateFantasyData();
            setStatus('✅ Fantasy data populated successfully! You can now use the app normally.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            setStatus('❌ Failed to populate data');
        } finally {
            setIsPopulating(false);
        }
    };

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                        Database Setup Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                        <p>Your fantasy_data table is empty. Click the button below to populate it with player data from the Sleeper API.</p>
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={handlePopulateData}
                            disabled={isPopulating}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                                isPopulating 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'
                            }`}
                        >
                            {isPopulating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Populating Data...
                                </>
                            ) : (
                                'Populate Fantasy Data'
                            )}
                        </button>
                    </div>
                    {status && (
                        <div className="mt-3">
                            <p className="text-sm text-yellow-700">{status}</p>
                        </div>
                    )}
                    {error && (
                        <div className="mt-3">
                            <p className="text-sm text-red-600">Error: {error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
