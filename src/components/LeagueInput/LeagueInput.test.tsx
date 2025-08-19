import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import LeagueInput from './LeagueInput';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('LeagueInput', () => {
    const mockOnLeagueSelect = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('shows error if no league ID entered', async () => {
        render(<LeagueInput onLeagueSelect={mockOnLeagueSelect} />);

        fireEvent.click(screen.getByRole('button', { name: /search/i }));

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

        expect(
            await screen.findByText(/Premier Fantasy League/i)
        ).toBeInTheDocument();
        expect(mockOnLeagueSelect).toHaveBeenCalledWith('12345');
    });

    test('shows error on fetch failure', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false } as Response);

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
