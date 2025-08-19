// src/components/LeagueInput.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeagueInput from './LeagueInput';

// mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('LeagueInput', () => {
    const mockOnLeagueSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('shows error if no league ID entered', async () => {
        render(<LeagueInput onLeagueSelect={mockOnLeagueSelect} />);

        const button = screen.getByRole('button', { name: /search/i });
        fireEvent.click(button);

        expect(
            await screen.findByText(/please enter a league id/i)
        ).toBeInTheDocument();
    });

    test('fetches and displays league data on success', async () => {
        const fakeData = {
            name: 'Premier Fantasy League',
            season: '2025',
            status: 'active',
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => fakeData,
        } as Response);

        render(<LeagueInput onLeagueSelect={mockOnLeagueSelect} />);

        fireEvent.change(screen.getByPlaceholderText(/enter league id/i), {
            target: { value: '12345' },
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        // shows loading first
        expect(await screen.findByText(/loading/i)).toBeInTheDocument();

        // then data appears
        expect(
            await screen.findByText(/Premier Fantasy League/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/Season: 2025/i)).toBeInTheDocument();
        expect(screen.getByText(/Status: active/i)).toBeInTheDocument();

        // parent callback called
        expect(mockOnLeagueSelect).toHaveBeenCalledWith('12345');
    });

    test('shows error on fetch failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
        } as Response);

        render(<LeagueInput onLeagueSelect={mockOnLeagueSelect} />);

        fireEvent.change(screen.getByPlaceholderText(/enter league id/i), {
            target: { value: '99999' },
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        expect(
            await screen.findByText(/league not found/i)
        ).toBeInTheDocument();
    });
});
