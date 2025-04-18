#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const Conf = require('conf');

// Initialize configuration store
const config = new Conf({ projectName: 'leetcode-joseok' });

// Setup version
const packageJson = require('../package.json');
program.version(packageJson.version);

// ASCII art logo
const displayLogo = () => {
  console.log(chalk.blue(`
    ╭───────────────────────────────────────╮
    │                                       │
    │    ${chalk.bold('LeetCode Ghost Window CLI')}           │
    │    ${chalk.gray('v' + packageJson.version)}                          │
    │                                       │
    ╰───────────────────────────────────────╯
  `));
};

// Helper to find the electron app path
const findElectronAppPath = () => {
  // Check common installation paths
  const commonPaths = [
    // Local development path
    path.join(__dirname, '..', '..', '..'),
    // Global npm installation paths
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'leetcode-ghost-window'),
    '/usr/local/lib/node_modules/leetcode-ghost-window',
    '/usr/lib/node_modules/leetcode-ghost-window',
    // Add more potential paths as needed
  ];

  for (const potentialPath of commonPaths) {
    if (fs.existsSync(path.join(potentialPath, 'main.js'))) {
      return potentialPath;
    }
  }

  return null;
};

// Initialize command
program
  .command('init')
  .description('Initialize and launch LeetCode Ghost Window')
  .action(async () => {
    displayLogo();

    const spinner = ora('Starting LeetCode Ghost Window...').start();

    try {
      const appPath = findElectronAppPath();

      if (!appPath) {
        spinner.fail('Could not find LeetCode Ghost Window installation');
        console.log(chalk.yellow(`
Please make sure you have the desktop application installed.
If you haven't installed it yet, please visit:
${chalk.cyan('https://github.com/joseook/leetcode-ghost-joseok/releases')}
        `));
        return;
      }

      // Get saved API key, if any
      const apiKey = config.get('apiKey');

      // Start the electron app
      const childProcess = exec(`npx electron ${path.join(appPath, 'main.js')}`, {
        env: {
          ...process.env,
          OPENAI_API_KEY: apiKey || '',
          GHOST_MODE: 'true'
        }
      });

      // Wait for app to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (childProcess.exitCode === null) {
        spinner.succeed('LeetCode Ghost Window successfully launched!');
        console.log(chalk.green('\nYou can now use the application to solve LeetCode problems.'));
        console.log(chalk.cyan('\nPress Ctrl+C in this terminal to exit the CLI (the app will keep running).'));
      } else {
        spinner.fail('Failed to launch LeetCode Ghost Window');
        console.log(chalk.red(`Exit code: ${childProcess.exitCode}`));
      }

      // Keep the process running
      process.stdin.resume();

      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\nExiting CLI. The app will continue running.'));
        process.exit(0);
      });

    } catch (error) {
      spinner.fail('Failed to launch LeetCode Ghost Window');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Config command
program
  .command('config')
  .description('Configure LeetCode Ghost Window settings')
  .option('set <key> <value>', 'Set a configuration value')
  .option('get <key>', 'Get a configuration value')
  .option('list', 'List all configuration values')
  .action((options) => {
    displayLogo();

    if (options.set) {
      const [key, value] = options.set.split(' ');
      config.set(key, value);
      console.log(chalk.green(`Configuration ${key} set to ${value}`));
    } else if (options.get) {
      const value = config.get(options.get);
      console.log(chalk.cyan(`${options.get}: ${value || 'Not set'}`));
    } else if (options.list) {
      const allConfig = config.store;
      console.log(chalk.cyan('Current configuration:'));

      if (Object.keys(allConfig).length === 0) {
        console.log(chalk.yellow('No configuration values set.'));
      } else {
        for (const [key, value] of Object.entries(allConfig)) {
          console.log(`${chalk.green(key)}: ${value}`);
        }
      }
    } else {
      console.log(chalk.yellow('Please specify a config operation: set, get, or list'));
    }
  });

// Capture command
program
  .command('capture')
  .description('Capture a screenshot of the current screen')
  .action(() => {
    displayLogo();
    console.log(chalk.yellow('This command is not yet implemented in the CLI version.'));
    console.log(chalk.cyan('Please use the desktop application for capturing screenshots.'));
  });

// Process command
program
  .command('process')
  .description('Process captured screenshots with AI')
  .action(() => {
    displayLogo();
    console.log(chalk.yellow('This command is not yet implemented in the CLI version.'));
    console.log(chalk.cyan('Please use the desktop application for processing screenshots.'));
  });

// Add a default command when no command is specified
program
  .action(() => {
    displayLogo();
    program.help();
  });

// Process CLI arguments
program.parse(process.argv);

// If no arguments, display help
if (process.argv.length <= 2) {
  displayLogo();
  program.help();
} 