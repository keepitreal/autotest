# Autotest

A Model Context Protocol (MCP) server that enables Cursor to interact with React Native apps running on iOS simulators. This server provides comprehensive control over iOS simulators, React Native development tools, and UI automation capabilities.

## 🚀 Features

### 🎮 Simulator Management

- Create and manage simulator sessions
- Boot, shutdown, and monitor simulator states
- List available and running simulators
- Focus simulator windows

### 📱 React Native Integration

- Launch and manage React Native applications
- React DevTools integration
- Component inspection and debugging

### 🖱️ UI Automation & Testing

- Tap, swipe, and gesture automation
- Element inspection by testID or coordinates
- Screenshot and video recording capabilities
- Accessibility element analysis

### 🛠️ Development Tools

- Real-time performance monitoring
- Network request logging
- Error boundary handling
- Component tree visualization

## 📋 Prerequisites

- **macOS**: Required for iOS simulator support
- **Node.js**: v18.0.0 or higher
- **Xcode**: With iOS simulators installed
- **Facebook IDB**: For iOS device/simulator communication
- **React Native CLI**: For building and running React Native apps

## 🔧 Installation

### 1. Install Dependencies

```bash
# Install Facebook IDB (required for iOS simulator communication)
brew install idb-companion
pipx install fb-idb

# Install React Native CLI globally (if not already installed)
npm install -g @react-native-community/cli
```

**Note**: The MCP server automatically handles IDB connections to simulators. You don't need to manually run `idb connect` commands!

### 2. Clone and Setup Project

```bash
git clone <repository-url>
cd rn-ios-simulator-mcp
npm install
npm run build
```

### 3. Configure with Cursor

First, get the full path to your project:

```bash
cd autotest
pwd
# Copy the output path (e.g., /Users/yourname/autotest)
```

Then add to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "autotest": {
      "command": "/Users/yourname/.nvm/versions/node/v22.16.0/bin/node",
      "args": ["/path/to/autotest/dist/index.js"],
      "env": {
        "RN_DEFAULT_DEVICE": "iPhone 15 Pro",
        "RN_DEFAULT_IOS_VERSION": "17.0",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Note**: If you're using nvm (Node Version Manager), use the full path to your node executable instead of just `"node"`. You can find your node path with:

```bash
which node
# Example output: /Users/yourname/.nvm/versions/node/v22.16.0/bin/node
```

## 🎯 Available Tools

### Simulator Management

- `mcp_server_healthcheck` - Check if MCP server is running and responsive
- `create_rn_simulator_session` - Create a new React Native simulator session
- `terminate_simulator_session` - Terminate an active session
- `boot_simulator` - Boot an iOS simulator by UDID
- `shutdown_simulator` - Shutdown a running simulator
- `list_available_simulators` - List all available simulators
- `list_booted_simulators` - List currently running simulators
- `focus_simulator` - Bring simulator window to front

### React Native Development

- `reload_rn_app` - Reload React Native app
- `open_rn_dev_menu` - Open React Native developer menu

### UI Testing & Automation

- `tap_coordinates` - Tap at specific screen coordinates
- `tap_element_by_testid` - Tap React Native element by testID
- `swipe_gesture` - Perform swipe gestures
- `take_screenshot` - Capture simulator screenshot
- `record_video` - Record simulator screen activity
- `inspect_element` - Inspect UI element at coordinates
- `get_accessibility_elements` - List all accessibility elements

### Debugging & Performance

- `enable_remote_debugging` - Enable remote JavaScript debugging
- `capture_performance_metrics` - Monitor app performance
- `log_network_requests` - Monitor network activity
- `get_component_tree` - Get React Native component hierarchy

## 💻 Usage Examples

Once configured with Cursor, you can use natural language commands:

```
"Check if the MCP server is running properly"

"Create a new React Native simulator session with iPhone 15 Pro for the project at ./MyReactNativeApp"

"Tap the element with testID 'login-button'"

"Take a screenshot and save it as app-screenshot.png"

"Open the React Native dev menu"

"Monitor network requests for 30 seconds"
```

## ⚙️ Configuration

### Environment Variables

```bash
# Simulator Configuration
RN_DEFAULT_DEVICE="iPhone 15 Pro"           # Default simulator device
RN_DEFAULT_IOS_VERSION="17.0"               # Default iOS version
RN_SIMULATOR_TIMEOUT="30000"                # Boot/shutdown timeout (ms)
RN_AUTO_BOOT="true"                         # Auto-boot on session create

# React Native Configuration
RN_BUNDLE_ID=""                             # Default bundle ID for app launching (e.g., com.mycompany.myapp)

# IDB Configuration
IDB_TIMEOUT="30000"                         # IDB command timeout (ms)
IDB_RETRY_ATTEMPTS="3"                      # Number of retry attempts
IDB_RETRY_DELAY="1000"                      # Delay between retries (ms)

# Headless Mode Configuration
HEADLESS_MODE="false"                       # Enable headless mode for CI/CD

# Optional Headless Overrides (only needed to customize defaults)
# HEADLESS_MODE_TYPE="cli-only"             # Headless mode type (cli-only|virtual-display|idb-companion)
# HEADLESS_DISPLAY_ID=":99"                 # Virtual display ID
# HEADLESS_RESOLUTION="1024x768"            # Virtual display resolution
# HEADLESS_COLOR_DEPTH="24"                 # Color depth for virtual display
# IDB_COMPANION_PORT="10880"                # IDB companion port
# IDB_COMPANION_TLS="false"                 # Enable TLS for IDB companion

# Logging Configuration
LOG_LEVEL="info"                            # Log level (debug, info, warning, error)
MCP_LOGGING="true"                          # Enable MCP protocol logging
```

## 🤖 Headless Mode for Automated QA Testing

Enables AI-powered testing through Cursor in CI/CD environments without GUI requirements.

**Quick Setup:**

Add `HEADLESS_MODE: "true"` to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "autotest": {
      "command": "/path/to/node",
      "args": ["/path/to/autotest/dist/index.js"],
      "env": {
        "RN_DEFAULT_DEVICE": "iPhone 15 Pro",
        "RN_DEFAULT_IOS_VERSION": "17.0",
        "HEADLESS_MODE": "true",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**For Linux (if needed for virtual display):**

```bash
sudo apt-get install xvfb
```

### Mode Types

**1. CLI-Only (Default for macOS)** - Uses `xcrun simctl` without GUI, no display needed
**2. Virtual Display (Linux)** - Add `"HEADLESS_MODE_TYPE": "virtual-display"` to MCP config - Uses Xvfb for virtual screen  
**3. IDB Companion** - Add `"HEADLESS_MODE_TYPE": "idb-companion"` to MCP config - Enhanced control via daemon

### LLM Testing Example

Use natural language commands through Cursor:

```
"Create iPhone 15 Pro simulator, launch MyApp, take screenshot, tap login button, enter test@example.com, press enter, verify results"
```

## 🔧 Troubleshooting

### MCP Server Connection Issues

If you're getting connection errors or tools aren't working:

1. **Use the healthcheck tool first**:
   ```
   "Check if the MCP server is running properly"
   ```
2. **Verify your Cursor configuration** (`~/.cursor/mcp.json`):
   - Correct path to `dist/index.js`
   - No syntax errors in JSON
3. **Common solutions**:
   - Restart Cursor after configuration changes
   - Rebuild the project: `npm run build`
   - Check if any simulators are running
   - Make sure `idb` is installed: `idb --help`

### Error: "Not connected"

This usually means IDB can't connect to simulators. The server now handles this automatically, but if you still see this:

- Try using `mcp_server_healthcheck` first
- Make sure at least one iOS simulator is running
- The server will auto-connect to simulators when you use tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Facebook IDB](https://github.com/facebook/idb) - iOS simulator communication
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol specification
- [React Native Community](https://reactnative.dev/) - React Native ecosystem

---

**Note**: This project is currently in development. The core architecture is complete, but some features are still being implemented. See the Development Status section for current progress.
