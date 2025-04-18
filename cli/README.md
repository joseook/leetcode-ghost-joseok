# LeetCode Ghost Window CLI

A command-line interface for the LeetCode Ghost Window application.

## Installation

```bash
npm install -g leetcode-joseok
```

## Usage

### Initialize and Launch the Application

```bash
leet-joseok init
```

This command will:
1. Search for your installed LeetCode Ghost Window application
2. Launch it with the correct settings
3. Keep it running in the background

### Configuration

Set your OpenAI API key for AI-powered solution processing:

```bash
leet-joseok config set apiKey YOUR_OPENAI_API_KEY
```

View all configuration values:

```bash
leet-joseok config list
```

### Help

Display help information:

```bash
leet-joseok help
```

## Prerequisites

- Node.js v18 or newer
- LeetCode Ghost Window desktop application must be installed

## Troubleshooting

If you encounter issues with the CLI not finding the desktop application, make sure:

1. You have installed the LeetCode Ghost Window desktop application
2. You have sufficient permissions to execute the application

## License

MIT 