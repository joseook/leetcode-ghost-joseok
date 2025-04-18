# LeetCode Ghost Window

<p align="center">
  <img src="assets/images/logo.png" alt="LeetCode Ghost Window Logo" width="120">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#cli-installation">CLI Installation</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#platforms">Platforms</a> •
  <a href="#wsl-setup">WSL Setup</a> •
  <a href="#build-distribution">Build Distribution</a> •
  <a href="#license">License</a>
</p>

LeetCode Ghost Window is an application designed to help you solve LeetCode problems while keeping your window completely invisible to screen recording software like OBS Studio, Discord streaming, or any other screen capture tools. It uses advanced window properties to create a truly "ghost" window that only you can see on your screen.

## Features

- ✨ **True Ghost Mode**: Advanced implementation for complete invisibility to screen recorders and streaming software
- 🖥️ **Multi-platform**: Enhanced compatibility with Windows, Linux, WSL, and macOS
- 🎨 **Minimalist Design**: Clean, modern interface that stays out of your way
- 📸 **Improved Screenshot Capture**: Streamlined process to capture all types of LeetCode problems
- 🤖 **Enhanced AI Analysis**: Process captured screenshots with OpenAI's API for detailed code solutions
- 🧩 **Multi-language Support**: Solutions in JavaScript, Python, Java, C++, and other popular languages
- 🔍 **Rich Code Formatting**: Improved syntax highlighting and code organization
- 🚀 **Detailed Explanations**: Solution breakdown with complexity analysis and approach explanations
- 🔄 **System Tray Integration**: Easy access to application functions even when hidden
- ⌨️ **Keyboard Shortcuts**: Control everything without leaving LeetCode
- 🖥️ **CLI Support**: Control LeetCode Ghost Window through command-line interface

## Advanced Ghost Mode

Version 1.2.0 introduces substantial improvements to the Ghost Mode functionality, making the window truly invisible to capture software:

- **Windows**: Uses native `SetWindowDisplayAffinity` and `DwmSetWindowAttribute` APIs for complete invisibility
- **Linux**: Improved X11/Wayland compatibility with advanced window properties
- **WSL**: Enhanced window layering and properties to avoid screen capture
- **macOS**: Enhanced window layering and properties to avoid screen capture

These techniques have been thoroughly tested against OBS Studio, Discord streaming, and other popular capture tools.

## Installation

### Pre-built Binaries

Download the latest pre-built binary from the [Releases](https://github.com/joseook/leetcode-ghost-joseok/releases) page:

- **Windows**: Download and run the `.exe` installer
- **macOS**: Download the `.dmg` file, open it, and drag the app to your Applications folder
- **Linux**: Download the `.AppImage` file (works on most distros) or specific `.deb`/`.rpm` packages

### Building from Source

```bash
# Clone this repository
git clone https://github.com/joseook/leetcode-ghost-joseok
cd leetcode-ghost-joseok

# Install dependencies (npm, yarn, or pnpm)
npm install
# OR
yarn install
# OR
pnpm install

# Run the app
npm start
```

## CLI Installation

You can also install the LeetCode Ghost Window CLI via npm:

```bash
# Install globally
npm install -g leetcode-joseok

# Verify installation
leet-joseok --version

# Launch the application
leet-joseok init
```

The CLI provides an easy way to launch and interact with the LeetCode Ghost Window application from your terminal. For more information, see the [CLI documentation](https://leetcode-docs-web.vercel.app/cli).

## Usage

1. **Launch the application**: It will start in Ghost Mode, invisible to screen recorders
2. **Enter your OpenAI API Key**: Required for processing screenshots
3. **Navigate to a LeetCode problem**
4. **Capture screenshots**: Use the shortcuts to capture the problem description
   - `Ctrl+Shift+1`: Capture first screenshot
   - `Ctrl+Shift+2`: Capture second screenshot (if needed)
   - `Ctrl+Shift+3`: Capture third screenshot (if needed)
5. **Process screenshots**: Use the AI to get a solution
   - `Ctrl+Shift+A`: Process with 1 image
   - `Ctrl+Shift+B`: Process with 2 images
   - `Ctrl+Shift+C`: Process with 3 images
6. **Window Management**:
   - `Ctrl+Shift+H`: Hide window
   - `Ctrl+Shift+S`: Show window
   - `Ctrl+Shift+Q`: Quit application
   - `Ctrl+Shift+M`: Toggle window drag mode

You can also access all functions through the system tray icon.

### CLI Usage

If you've installed the CLI, you can use the following commands:

```bash
# Launch the application
leet-joseok init

# Configure the OpenAI API key
leet-joseok config set apiKey YOUR_OPENAI_API_KEY

# Get help
leet-joseok help
```

## Improved Screenshot Capture

Version 1.3.0 introduces an enhanced screenshot system:

- **Direct Screen Capture**: Instantly captures your screen when shortcuts are pressed
- **Automatic Preview**: Shows screenshot thumbnails directly in the application
- **Multi-capture Support**: Take up to 3 screenshots for complex problems with multiple sections
- **Visual Feedback**: Status indicators show which screenshots have been captured

## Enhanced Solution Processing

The upgraded AI processing now provides:

- **Comprehensive Solutions**: Complete code with detailed explanations
- **Multiple Language Support**: Automatically detects and provides solutions in appropriate languages:
  - JavaScript/TypeScript
  - Python
  - Java
  - C++
  - Other languages based on the problem context
- **Complexity Analysis**: Time and space complexity evaluation for each solution
- **Approach Explanation**: Detailed breakdown of the solution approach and algorithm
- **Code Commentary**: Well-commented code that explains the implementation
- **Alternative Solutions**: When applicable, provides multiple approaches with trade-offs

## Minimalist Design

The new minimalist design provides a clean, distraction-free interface:

- **Frameless Window**: Modern look with custom title bar
- **Compact Layout**: Optimized for screen real estate
- **Dark Theme**: Easy on the eyes during coding sessions
- **Visual Indicators**: Clear status feedback for screenshots and ghost mode

## How It Works

### Ghost Mode Technology

The application uses different techniques depending on your operating system:

- **Windows**: 
  - `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE` flag
  - `DwmSetWindowAttribute` with `DWMWA_CLOAK` for advanced hiding
  - Additional window style modifications to prevent detection

- **Linux**: 
  - Combines X11/Wayland window properties
  - Uses selective transparency and window type modifications
  - Applies CSS techniques to avoid compositor capture

- **WSL**: 
  - Specialized window layering and visibility settings
  - Window property modifications to avoid detection
  - CSS and rendering adjustments to evade capture systems

- **macOS**: 
  - Window layering and opacity adjustments
  - Content protection and workspace visibility modifications
  - Specialized window button visibility settings

These techniques make the window completely invisible to screen recording software while still being visible to you.

### Screenshot Processing

1. The app captures screenshots of your screen
2. Images are processed using OpenAI's Vision API
3. The AI analyzes the LeetCode problem and generates a comprehensive solution
4. The solution is displayed with syntax highlighting, explanations, and complexity analysis

## Platforms

| Platform | Support | Additional Notes |
|----------|---------|------------------|
| Windows  | ✅ Full | Enhanced ghost capabilities, thoroughly tested on Windows 10/11 |
| Linux    | ✅ Full | Improved Wayland and X11 support, tested on Ubuntu 22.04, Fedora, and Arch |
| WSL      | ✅ Full | Enhanced window property settings, tested on WSL1 and WSL2 |
| macOS    | ✅ Full | Enhanced window property settings, tested on macOS Ventura and Sonoma |

## WSL Setup

To run the application in WSL (Windows Subsystem for Linux), you'll need an X server on Windows:

### 1. Install an X Server on Windows

We recommend using [VcXsrv](https://sourceforge.net/projects/vcxsrv/) or [Xming](https://sourceforge.net/projects/xming/).

#### Using VcXsrv:
1. Download and install VcXsrv from [SourceForge](https://sourceforge.net/projects/vcxsrv/)
2. Start XLaunch
3. In the settings:
   - Select "Multiple windows" and "Display number" as 0
   - Select "Start no client"
   - In "Extra settings", check "Disable access control"
   - **Important**: When finishing, ensure Windows Firewall allows both public and private connections

### 2. Configure WSL

1. Use our automated launcher script:

```bash
npm run wsl
```

This script will:
- Automatically configure the DISPLAY variable
- Detect whether you're using WSL1 or WSL2
- Try multiple DISPLAY options until it finds a working one
- Provide troubleshooting tips if the X server is not found

2. Alternatively, you can manually configure:

```bash
# For WSL2
export DISPLAY=$(grep -m 1 nameserver /etc/resolv.conf | awk '{print $2}'):0.0

# For WSL1
export DISPLAY=:0
```

### WSL Troubleshooting

#### Window doesn't appear:
- **VcXsrv not running**: Start VcXsrv using XLaunch
- **Firewall settings**: Make sure VcXsrv has permission in the firewall for BOTH public AND private connections
- **Access control**: Make sure to check "Disable access control" in VcXsrv settings
- **Incorrect DISPLAY**: Try manually adjusting DISPLAY:
  ```bash
  # Try these options:
  export DISPLAY=:0
  export DISPLAY=:0.0
  export DISPLAY=localhost:0.0
  export DISPLAY=$(grep nameserver /etc/resolv.conf | awk '{print $2}'):0.0
  ```

#### Ghost Mode limitations in WSL:
- In WSL, there are technical limitations for ghost mode due to architectural differences
- Basic mode still works, but some advanced techniques aren't available in WSL

#### Testing X11 configuration:
- Run this command to check if X11 is working:
  ```bash
  xeyes
  ```
  If a window with eyes appears, your X11 is properly configured

## Build Distribution

To create distribution packages for different platforms, we use Electron Builder. This will create installers, executables, and portable packages that you can distribute.

### Creating Application Icons

Before building the distribution packages, you should create proper application icons:

1. **Required Icon Formats**:
   - Windows: `.ico` file (256x256 pixels recommended)
   - macOS: `.icns` file
   - Linux: `.png` files in multiple sizes (16x16, 32x32, 48x48, 64x64, 128x128, 256x256)

2. **Creating Icons**:
   - You can use tools like [Icon Maker](https://iconmaker.app/) or [Electron Icon Generator](https://www.npmjs.com/package/electron-icon-builder)
   - For command line, install the icon generator:
     ```bash
     npm install -g electron-icon-builder
     ```
   - Then generate icons:
     ```bash
     electron-icon-builder --input=./source-icon.png --output=./assets
     ```

3. **Icon Placement**:
   - Place Windows icons in `assets/images/icon.ico`
   - Place macOS icons in `assets/images/icon.icns`
   - Place Linux icons in `assets/images/` with proper sizes

### Pre-requisites

Make sure you have all dependencies installed:

```bash
npm install
```

### Building Distribution Packages

#### For All Platforms
```bash
npm run dist
```

#### For Specific Platforms

**Windows:**
```bash
npm run dist:win
```
This will create:
- `dist/leetcode-ghost-window-Setup-{version}.exe` - Windows installer
- `dist/leetcode-ghost-window-{version}-win.zip` - Portable Windows application

**macOS:**
```bash
npm run dist:mac
```
This will create:
- `dist/LeetCode Ghost Window-{version}.dmg` - macOS disk image
- `dist/LeetCode Ghost Window-{version}-mac.zip` - Compressed macOS application

**Linux:**
```bash
npm run dist:linux
```
This will create:
- `dist/leetcode-ghost-window-{version}.AppImage` - Cross-distro AppImage
- `dist/leetcode-ghost-window_{version}_amd64.deb` - Debian/Ubuntu package
- `dist/leetcode-ghost-window-{version}.x86_64.rpm` - Red Hat/Fedora package

### Publishing to GitHub Releases

To automatically publish your builds to GitHub Releases:

1. Create a GitHub personal access token with `repo` scope
2. Set the token as an environment variable:
   ```bash
   export GH_TOKEN=your_token_here
   ```
3. Run the release command:
   ```bash
   npm run dist -- -p always
   ```

### Code Signing

For production builds, you should sign your application:

#### Windows Code Signing
```bash
npm run dist:win -- --win --x64 --ia32 --c.win.certificateFile=/path/to/cert.pfx --c.win.certificatePassword=password
```

#### macOS Code Signing
```bash
npm run dist:mac -- --mac --c.mac.identity='Developer ID Application: Your Name (TEAMID)'
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Developer Support

If you'd like to support the development of this project:

- Star this repository
- Report any issues or suggest improvements
- Contribute to the codebase with pull requests

