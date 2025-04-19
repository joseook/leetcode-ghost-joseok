# LeetCode Ghost Window

<p align="center">
  <img src="assets/images/logo.png" alt="LeetCode Ghost Window Logo" width="120">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#platforms">Platforms</a> •
  <a href="#responsible-use">Responsible Use</a> •
  <a href="#license">License</a>
</p>

LeetCode Ghost Window is an application designed to help you solve LeetCode problems by creating a window that stays hidden from screen recording software. This tool provides assistance while practicing and learning algorithmic problem-solving.

> 📚 For comprehensive documentation, visit our website: [https://leetghost.online](https://leetghost.online)

## Features

- ✨ **Ghost Mode**: Window remains invisible to screen recorders and streaming software
- 🖥️ **Multi-platform**: Works on Windows, Linux, WSL, and macOS
- 🎨 **Clean Design**: Minimalist interface that stays out of your way
- 📸 **Screenshot Capture**: Easily capture LeetCode problems with keyboard shortcuts
- 🤖 **AI Analysis**: Process screenshots with OpenAI's API for solution suggestions
- 🧩 **Multi-language Support**: Solutions in JavaScript, Python, Java, C++, and more
- 🚀 **Detailed Explanations**: Solution breakdown with complexity analysis
- ⌨️ **Keyboard Shortcuts**: Control everything with convenient shortcuts
- 🖥️ **CLI Support**: Command-line interface for additional flexibility

## Installation

### Download Pre-built Binaries

Download the latest version from our [Releases](https://github.com/joseook/leetcode-ghost-joseok/releases) page:

- **Windows**: Download and run the `.exe` installer
- **macOS**: Download the `.dmg` file, open it, and drag the app to your Applications folder
- **Linux**: Download the `.AppImage` file (works on most distros) or specific `.deb`/`.rpm` packages

### Install via NPM

You can also install the LeetCode Ghost Window CLI via npm:

```bash
# Install globally
npm install -g leetcode-joseok

# Verify installation
leet-joseok --version

# Launch the application
leet-joseok init
```

## Usage

1. **Launch the application**: It will start in Ghost Mode by default
2. **Enter your OpenAI API Key**: Required for AI processing of screenshots
3. **Navigate to a LeetCode problem**
4. **Capture screenshots**: Use keyboard shortcuts to capture the problem
   - `Ctrl+Shift+1` (Windows/Linux) or `⌘+⇧+1` (macOS): Capture first screenshot
   - `Ctrl+Shift+2` or `⌘+⇧+2`: Capture second screenshot (if needed)
   - `Ctrl+Shift+3` or `⌘+⇧+3`: Capture third screenshot (if needed)
5. **Process screenshots**: Get AI-powered solution suggestions
   - `Ctrl+Shift+A` or `⌘+⇧+A`: Process with 1 image
   - `Ctrl+Shift+B` or `⌘+⇧+B`: Process with 2 images
   - `Ctrl+Shift+C` or `⌘+⇧+C`: Process with 3 images
6. **Window Management**:
   - `Ctrl+Shift+H` or `⌘+⇧+H`: Hide window
   - `Ctrl+Shift+S` or `⌘+⇧+S`: Show window
   - `Ctrl+Shift+Q` or `⌘+⇧+Q`: Quit application
   - `Ctrl+Shift+M` or `⌘+⇧+M`: Toggle window drag mode

You can also access all functions through the system tray icon.

## Platforms

LeetCode Ghost Window is compatible with multiple operating systems:

| Platform | Support | Notes |
|----------|---------|-------|
| Windows  | ✅ Full | Works on Windows 10/11 |
| Linux    | ✅ Full | Works on major distributions (Ubuntu, Fedora, Arch) |
| WSL      | ✅ Full | Works on Windows Subsystem for Linux |
| macOS    | ✅ Full | Works on macOS Ventura, Sonoma, and newer versions |

## Responsible Use

**Important Statement from the Author (joseok):**

LeetCode Ghost Window is designed as a learning and practice tool to help users understand algorithmic problem-solving. The author and contributors do not endorse or encourage:

- Using this software to cheat during actual job interviews
- Misrepresenting your skills in professional settings
- Violating any terms of service of LeetCode or similar platforms

The primary goal of this tool is to facilitate learning and practice in a comfortable environment. Users are expected to use this software ethically and responsibly. Remember that true understanding of algorithms and data structures is crucial for success in technical roles.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <a href="https://leetghost.online">📚 Documentation</a> •
  <a href="https://github.com/joseook/leetcode-ghost-joseok/issues">🐛 Report Bug</a> •
  <a href="https://github.com/joseook/leetcode-ghost-joseok/releases">📦 Releases</a>
</p>

