#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const Conf = require('conf');
const inquirer = require('inquirer');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const os = require('os');

// Version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;

// Configuration
const config = new Conf({
  projectName: 'leetcode-ghost-window',
  schema: {
    apiKey: {
      type: 'string',
      default: ''
    },
    ghostMode: {
      type: 'boolean',
      default: true
    },
    language: {
      type: 'string',
      enum: ['javascript', 'python', 'java', 'cpp', 'c++', 'c#', 'go', 'ruby', 'swift', 'typescript', 'php', 'rust', 'kotlin'],
      default: 'javascript'
    },
    opacity: {
      type: 'number',
      minimum: 0.1,
      maximum: 1.0,
      default: 0.9
    },
    theme: {
      type: 'string',
      enum: ['dark', 'light'],
      default: 'dark'
    }
  }
});

// ASCII Art logo
function displayLogo() {
  console.log(chalk.cyan(`
  ╭──────────────────────────────────────────╮
  │                                          │
  │   LeetCode Ghost Window CLI v${version}      │
  │                                          │
  ╰──────────────────────────────────────────╯
  `));
}

// Main program definition
program
  .name('leet-joseok')
  .description('Command-line interface for LeetCode Ghost Window')
  .version(version);

// Init command
program
  .command('init')
  .description('Initialize and launch LeetCode Ghost Window')
  .option('-q, --quiet', 'Reduce output verbosity')
  .action((options) => {
    if (!options.quiet) {
      displayLogo();
    }

    console.log(chalk.cyan('Initializing LeetCode Ghost Window...'));

    // Check if the app is installed
    const spinner = ora('Searching for LeetCode Ghost Window installation...').start();

    // Paths to look for the application
    let appPaths = [];
    let executableName = '';

    if (process.platform === 'win32') {
      executableName = 'LeetCode Ghost Window.exe';
      appPaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'leetcode-ghost-window', executableName),
        path.join('C:', 'Program Files', 'LeetCode Ghost Window', executableName),
        path.join('C:', 'Program Files (x86)', 'LeetCode Ghost Window', executableName)
      ];
    } else if (process.platform === 'darwin') {
      executableName = 'LeetCode Ghost Window.app';
      appPaths = [
        path.join('/Applications', executableName),
        path.join(os.homedir(), 'Applications', executableName)
      ];
    } else if (process.platform === 'linux') {
      executableName = 'leetcode-ghost-window';
      appPaths = [
        path.join('/usr', 'bin', executableName),
        path.join('/usr', 'local', 'bin', executableName),
        path.join(os.homedir(), '.local', 'bin', executableName)
      ];
    }

    // Check if the app exists in any of the paths
    let appPath = null;
    for (const path of appPaths) {
      if (fs.existsSync(path)) {
        appPath = path;
        break;
      }
    }

    // If the app is not found, offer to download it
    if (!appPath) {
      spinner.fail('LeetCode Ghost Window not found.');

      const openRepo = () => {
        console.log(chalk.cyan('Opening GitHub repository...'));
        const url = 'https://github.com/joseook/leetcode-ghost-joseok';

        let command;
        switch (process.platform) {
          case 'win32':
            command = `start ${url}`;
            break;
          case 'darwin':
            command = `open ${url}`;
            break;
          default:
            command = `xdg-open ${url}`;
        }

        exec(command, (error) => {
          if (error) {
            console.log(chalk.yellow(`Could not open browser automatically. Please visit: ${url}`));
          }
          process.exit(0);
        });
      };

      inquirer
        .prompt([
          {
            type: 'confirm',
            name: 'download',
            message: 'Would you like to download LeetCode Ghost Window?',
            default: true
          }
        ])
        .then((answers) => {
          if (answers.download) {
            openRepo();
          } else {
            console.log(chalk.yellow('Installation cancelled. Please install LeetCode Ghost Window to use this CLI.'));
            process.exit(0);
          }
        });
      return;
    }

    spinner.succeed(`Found LeetCode Ghost Window at: ${appPath}`);

    // Launch the application
    spinner.text = 'Launching LeetCode Ghost Window...';
    spinner.start();

    let appProcess;
    if (process.platform === 'darwin') {
      appProcess = spawn('open', [appPath]);
    } else if (process.platform === 'win32') {
      appProcess = spawn(appPath, [], { detached: true, stdio: 'ignore' });
    } else {
      appProcess = spawn(appPath, [], { detached: true, stdio: 'ignore' });
    }

    appProcess.unref();

    // Check if the API key is set
    const apiKey = config.get('apiKey');
    if (!apiKey) {
      spinner.warn('No OpenAI API key found. Some features may not work correctly.');
      console.log(chalk.yellow('Tip: Set your API key with "leet-joseok config set apiKey YOUR_API_KEY"'));
    } else {
      spinner.succeed('API key found. AI processing is available.');
    }

    spinner.succeed('LeetCode Ghost Window is now running in ghost mode!');
    console.log(chalk.green('You can now use keyboard shortcuts to capture and process LeetCode problems.'));
    console.log(chalk.green('For help with keyboard shortcuts, run "leet-joseok help".'));
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
    console.log(chalk.cyan('Capturing screenshot...'));

    // Implementation depends on how the application handles screenshot capturing
    console.log(chalk.yellow('This feature requires the main application to be running.'));
    console.log(chalk.yellow('Please use the keyboard shortcuts within the application for now.'));
  });

// Process command
program
  .command('process')
  .description('Process captured screenshots with AI')
  .action(() => {
    displayLogo();
    console.log(chalk.cyan('Processing captured screenshots...'));

    // Check if API key is set
    const apiKey = config.get('apiKey');
    if (!apiKey) {
      console.log(chalk.red('Error: No OpenAI API key found.'));
      console.log(chalk.yellow('Please set your API key with "leet-joseok config set apiKey YOUR_API_KEY"'));
      return;
    }

    // Implementation depends on how the application handles AI processing
    console.log(chalk.yellow('This feature requires the main application to be running.'));
    console.log(chalk.yellow('Please use the keyboard shortcuts within the application for now.'));
  });

// Help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    displayLogo();
    console.log(chalk.cyan('LeetCode Ghost Window - Command Line Interface'));
    console.log(chalk.cyan('---------------------------------------------'));
    console.log('\nAvailable Commands:');

    console.log(`${chalk.green('init')} - Initialize and launch LeetCode Ghost Window`);
    console.log(`${chalk.green('config set <key> <value>')} - Set a configuration value`);
    console.log(`${chalk.green('config get <key>')} - Get a configuration value`);
    console.log(`${chalk.green('config list')} - List all configuration values`);
    console.log(`${chalk.green('capture')} - Capture a screenshot (requires main application)`);
    console.log(`${chalk.green('process')} - Process screenshots with AI (requires main application)`);
    console.log(`${chalk.green('help')} - Display this help information`);

    console.log('\nKeyboard Shortcuts (When application is running):');
    console.log(`${chalk.green('Ctrl+Shift+1')} - Capture primary screenshot`);
    console.log(`${chalk.green('Ctrl+Shift+2')} - Capture secondary screenshot`);
    console.log(`${chalk.green('Ctrl+Shift+3')} - Capture tertiary screenshot`);
    console.log(`${chalk.green('Ctrl+Shift+A')} - Process with 1 screenshot`);
    console.log(`${chalk.green('Ctrl+Shift+B')} - Process with 2 screenshots`);
    console.log(`${chalk.green('Ctrl+Shift+C')} - Process with 3 screenshots`);
    console.log(`${chalk.green('Ctrl+Shift+G')} - Toggle ghost mode`);
    console.log(`${chalk.green('Ctrl+Shift+H')} - Hide window`);
    console.log(`${chalk.green('Ctrl+Shift+S')} - Show window`);
    console.log(`${chalk.green('Ctrl+Shift+Q')} - Quit application`);

    console.log('\nFor more information, visit: https://github.com/joseook/leetcode-ghost-joseok');
  });

program.parse(process.argv); 