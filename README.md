# League Analyzer

A React application for analyzing Sleeper fantasy football league data with roster projections and matchup analysis.

## Features

- **League Search**: Enter a Sleeper league ID to load league data
- **Roster Analysis**: View rosters with players ordered by position and projected points
- **Matchup View**: See weekly matchups with calculated projection totals
- **Session Storage**: Your league ID and week selection are saved between sessions
- **Responsive Design**: Clean, modern UI built with Tailwind CSS

## Development

### Prerequisites

- Node.js 18.x or higher
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Testing

Run the test suite:
```bash
npm run test
```

### Building for Production

Build the application:
```bash
npm run build
```

## Deployment

This application is automatically deployed to GitHub Pages when changes are pushed to the `master` branch.

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```
2. The built files will be in the `dist` directory
3. Deploy the contents of the `dist` directory to your hosting service

## Usage

1. Enter a Sleeper league ID (e.g., `1259966529118674944`)
2. Select a week to analyze
3. View roster projections and matchup data
4. Your selections are automatically saved for the next visit

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **GitHub Actions** - CI/CD
- **GitHub Pages** - Hosting

## API

This application uses the Sleeper API for fantasy football data:
- League information
- Roster data
- Matchup information
- Player projections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).