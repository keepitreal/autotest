# React Native iOS Simulator MCP Server

A Model Context Protocol (MCP) server that enables Cursor to interact with React Native apps running on iOS simulators. This server provides comprehensive control over iOS simulators, React Native development tools, and UI automation capabilities.

## 🚀 Features

### 🎮 Simulator Management

- Create and manage simulator sessions
- Boot, shutdown, and monitor simulator states
- List available and running simulators
- Focus simulator windows

### 📱 React Native Integration

- Build and run React Native applications
- Start/stop Metro bundler with cache management
- Enable Fast Refresh and Hot Reload
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
pip3 install fb-idb

# Install React Native CLI globally (if not already installed)
npm install -g @react-native-community/cli
```

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
    "rn-ios-simulator": {
      "command": "node",
      "args": ["/path/to/autodev/dist/index.js"],
      "env": {
        "RN_DEFAULT_DEVICE": "iPhone 15 Pro",
        "RN_DEFAULT_IOS_VERSION": "17.0",
        "RN_METRO_PORT": "8081",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🎯 Available Tools

### Simulator Management

- `create_rn_simulator_session` - Create a new React Native simulator session
- `terminate_simulator_session` - Terminate an active session
- `boot_simulator` - Boot an iOS simulator by UDID
- `shutdown_simulator` - Shutdown a running simulator
- `list_available_simulators` - List all available simulators
- `list_booted_simulators` - List currently running simulators
- `focus_simulator` - Bring simulator window to front

### React Native Development

- `build_and_run_rn_app` - Build and run React Native app on simulator
- `start_metro` - Start Metro bundler for React Native
- `stop_metro` - Stop Metro bundler
- `reload_rn_app` - Reload React Native app
- `enable_fast_refresh` - Enable React Native Fast Refresh
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
"Create a new React Native simulator session with iPhone 15 Pro for the project at ./MyReactNativeApp"

"Build and run the React Native app on the current simulator"

"Start Metro bundler with cache reset"

"Tap the element with testID 'login-button'"

"Take a screenshot and save it as app-screenshot.png"

"Enable Fast Refresh and open the dev menu"

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
RN_METRO_PORT="8081"                        # Metro bundler port
RN_DEFAULT_SCHEME="Debug"                   # Default build scheme
RN_BUILD_TIMEOUT="300000"                   # Build timeout (ms)
RN_FAST_REFRESH="true"                      # Enable Fast Refresh by default

# IDB Configuration
IDB_TIMEOUT="30000"                         # IDB command timeout (ms)
IDB_RETRY_ATTEMPTS="3"                      # Number of retry attempts
IDB_RETRY_DELAY="1000"                      # Delay between retries (ms)

# Logging Configuration
LOG_LEVEL="info"                            # Log level (debug, info, warning, error)
MCP_LOGGING="true"                          # Enable MCP protocol logging
```

## 🏗️ Project Structure

```
rn-ios-simulator-mcp/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── server/                     # MCP server implementation
│   │   ├── MCPServer.ts           # Core MCP protocol handler
│   │   ├── ToolRegistry.ts        # Tool registration system
│   │   └── CommandRouter.ts       # Command routing logic
│   ├── managers/                   # Core managers
│   │   ├── SimulatorManager.ts    # iOS simulator management
│   │   ├── ReactNativeAppManager.ts # RN app lifecycle
│   │   ├── UIAutomationManager.ts # UI testing automation
│   │   └── DevelopmentToolsManager.ts # Dev tools integration
│   ├── services/                   # React Native services
│   │   ├── MetroBundlerService.ts # Metro integration
│   │   ├── ReactDevToolsService.ts # DevTools bridge
│   │   └── PerformanceService.ts  # Performance monitoring
│   ├── tools/                      # MCP tool implementations
│   │   ├── simulator/             # Simulator tools
│   │   ├── reactnative/          # React Native tools
│   │   ├── testing/              # UI testing tools
│   │   └── debugging/            # Debugging tools
│   ├── types/                      # TypeScript definitions
│   │   ├── simulator.ts          # Simulator types
│   │   ├── reactnative.ts        # React Native types
│   │   └── mcp.ts               # MCP protocol types
│   └── utils/                      # Utilities
│       ├── logger.ts             # Logging system
│       ├── config.ts             # Configuration management
│       └── idb.ts               # IDB wrapper
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 Development Status

### ✅ Completed Components

- **Project Structure**: Complete directory structure and TypeScript configuration
- **Type Definitions**: Comprehensive type system for all components
- **Configuration System**: Environment-based configuration with validation
- **Logging System**: Multi-level logging with MCP protocol integration
- **IDB Wrapper**: Facebook IDB integration for iOS simulator communication
- **Simulator Manager**: Core simulator lifecycle management
- **MCP Protocol Foundation**: Base server structure and tool registry

### 🚧 In Progress

- **MCP SDK Integration**: Finalizing MCP protocol implementation
- **Tool Implementations**: Building specific MCP tools
- **React Native Services**: Metro bundler and DevTools integration
- **UI Automation**: Touch and gesture automation system

### 📋 Next Steps

1. **Install Dependencies**: `npm install` to resolve import errors
2. **Complete MCP Tools**: Implement remaining tool categories
3. **Add React Native Services**: Metro bundler and DevTools integration
4. **Testing & Validation**: End-to-end testing with real React Native apps
5. **Documentation**: Complete API documentation and examples

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
