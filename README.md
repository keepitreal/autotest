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
git clone https://github.com/keepitreal/autotest
cd autotest
npm install
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
      "command": "/path/to/where/you/keep/node",
      "args": ["/path/to/autotest/dist/index.js"],
      "env": {
        "RN_DEFAULT_DEVICE": "iPhone 15 Pro",
        "RN_DEFAULT_IOS_VERSION": "17.0",
        "SCREENSHOT_PATH": "/Users/yourname/your-project/screenshots",
        "VIDEO_PATH": "/Users/yourname/your-project/videos",
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
- `create_rn_simulator_session` - Create a new React Native simulator session (auto-boots by default)
- `boot_simulator` - Boot an iOS simulator by UDID
- `shutdown_simulator` - Shutdown a running simulator
- `list_available_simulators` - List all available simulators
- `list_booted_simulators` - List currently running simulators
- `focus_simulator` - Bring simulator window to front

### React Native Development

- `install_rn_app` - Install a React Native app on the simulator
- `launch_rn_app` - Launch a React Native app on the simulator
- `reload_rn_app` - Reload React Native app
- `open_rn_dev_menu` - Open React Native developer menu

### UI Testing & Automation

- `take_screenshot` - Capture simulator screenshot
- `tap_coordinates` - Tap at specific screen coordinates (supports duration for long press)
- `long_press_coordinates` - Long press at specific screen coordinates
- `press_hardware_button` - Press hardware buttons (Home, Lock, Side Button, Siri, Apple Pay)
- `input_text` - Input text into the currently focused text field
- `press_key` - Press a specific key (useful for Enter, Backspace, etc.)
- `press_key_sequence` - Press a sequence of keys in order
- `clear_text_field` - Clear the currently focused text field
- `swipe_gesture` - Perform a swipe gesture between two points
- `scroll_gesture` - Perform a scroll gesture in a specific direction
- `inspect_element` - Inspect UI element at specific coordinates
- `get_accessibility_elements` - Get all accessibility elements on screen (preferred for navigation)
- `record_video` - Record video of the simulator screen

### Push Notifications & Deep Links

- `send_notification` - Send a push notification to an app
- `send_notification_and_tap` - Send notification and automatically tap it

### Biometric Authentication

- `simulate_matching_face_id` - Simulate successful Face ID
- `simulate_non_matching_face_id` - Simulate failed Face ID
- `simulate_matching_touch_id` - Simulate successful Touch ID
- `simulate_non_matching_touch_id` - Simulate failed Touch ID

### Location Services

- `set_location` - Set the simulator's GPS location

## 🎯 MCP Prompts - Best Practice Workflows

The MCP server provides intelligent prompts that guide you through best practices for simulator testing.

### Available Prompts

1. **`start_simulator_test`** - Best practices workflow for starting simulator testing

   - Parameters: `app_name` (optional), `device_type` (optional)
   - Guides you through checking for running simulators and setting up your test environment

2. **`test_ui_flow`** - Guided workflow for testing a UI flow in your app

   - Parameters: `flow_description` (required)
   - Uses accessibility tools to navigate and validate UI flows

3. **`debug_simulator_issue`** - Troubleshooting guide for common simulator issues

   - Parameters: `issue_description` (required)
   - Systematically diagnoses issues using accessibility data

4. **`setup_test_environment`** - Complete setup guide for simulator testing environment

   - No parameters required
   - Comprehensive walkthrough including accessibility tool verification

5. **`navigate_with_accessibility`** - Guide for navigating apps using accessibility tools
   - Parameters: `target_screen` (required)
   - Step-by-step approach to finding and interacting with UI elements

### Why Accessibility-Based Navigation?

The prompts emphasize using these tools for navigation:

- **`get_accessibility_elements`** - Provides complete UI hierarchy with labels and coordinates
- **`inspect_element`** - Gets detailed information about specific UI elements
- **`tap_coordinates`** - Interacts with elements using exact coordinates from accessibility data

This approach is more reliable than screenshot-based navigation because:

- LLMs receive structured, parseable data instead of images
- Element labels and coordinates are immediately actionable
- Works consistently across different UI states and themes

### Using Prompts in Cursor

Simply ask Cursor to use one of the prompts:

```
"Use the start_simulator_test prompt to help me test MyApp"
"I need to test the login flow - use the test_ui_flow prompt"
"Help me debug why my simulator isn't responding - use the debug_simulator_issue prompt"
```

## 💻 Usage Examples

Once configured with Cursor, you can use natural language commands:

```
"Check if the MCP server is running properly"

"Create a new React Native simulator session with iPhone 15 Pro for the project at ./MyReactNativeApp"

"Take a screenshot and save it as app-screenshot.png"

"Tap at coordinates (200, 400)"

"Long press at coordinates (150, 300) for 3 seconds"

"Press the home button"

"Input the text 'hello@example.com' into the focused text field"

"Press the enter key"

"Press a key sequence: cmd+a then backspace to select all and delete"

"Swipe from (100, 300) to (100, 100) to scroll up"

"Send a push notification with title 'Test' and body 'Hello World' to com.example.myapp"

"Send a notification with deep link to open profile screen: title 'New Message', body 'You have a new message', url 'myapp://profile/123'"

"Send notification with universal link: title 'View Product', body 'Check out this item', url 'https://myapp.com/product/456'"

"Send notification and automatically tap it to test deep linking: title 'Test Deep Link', body 'Testing navigation', url 'myapp://profile/123'"

"Set the GPS location to latitude 37.7749 longitude -122.4194 (San Francisco)"

"Open the React Native dev menu"

"Record a video of the simulator screen"
```

## 🔗 Deep Linking with Push Notifications

The `send_notification` tool supports deep linking to test how your app handles incoming notifications that should navigate to specific screens or content.

### Types of Deep Links Supported

**1. Custom URL Schemes**

```javascript
// Opens app to a specific screen using custom scheme
url: "myapp://profile/user123";
url: "myapp://product/456?category=electronics";
url: "myapp://chat/conversation789";
```

**2. Universal Links**

```javascript
// Uses HTTPS URLs that your app is registered to handle
url: "https://myapp.com/profile/user123";
url: "https://myapp.com/product/456";
url: "https://myapp.com/share/content789";
```

**3. Custom Data for App Routing**

```javascript
// Use userData for complex routing logic
userData: {
  screen: "profile",
  userId: "123",
  tab: "settings",
  action: "edit"
}
```

### Testing Examples

**Basic Notification:**

```
"Send notification to com.myapp.example with title 'Welcome' and body 'Welcome to our app!'"
```

**Profile Deep Link:**

```
"Send notification with title 'Profile Updated' body 'Your profile has been updated' url 'myapp://profile/123' to com.myapp.example"
```

**E-commerce Deep Link:**

```
"Send notification with title 'Sale Alert' body 'Your wishlist item is on sale!' url 'https://myapp.com/product/456' to com.myapp.shop"
```

**Complex Routing:**

```
"Send notification with title 'New Message' body 'You have a new message' and userData containing screen='chat', conversationId='789', autoOpen=true to com.myapp.messenger"
```

### App Integration Requirements

For deep linking to work in your React Native app, ensure you have:

1. **URL Scheme Registration** (iOS `Info.plist`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>myapp</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

2. **Universal Links Setup** (Apple App Site Association file)

3. **React Native Linking** in your app:

```javascript
import { Linking } from "react-native";

// Listen for deep links
Linking.addEventListener("url", handleDeepLink);

// Handle notification data
const handleNotification = (notification) => {
  if (notification.data.screen) {
    // Navigate based on custom data
    navigation.navigate(notification.data.screen, {
      userId: notification.data.userId,
    });
  }
};
```

This allows you to test the complete notification → deep link → app navigation flow during your QA process.

### Notification Tapping Solutions

**Problem:** iOS notification banners dismiss quickly (3-5 seconds), making them hard to tap during automated testing.

**Solutions:**

**1. Banner Tap Method (Default)**

```
"Send notification and tap: title 'Test', body 'Deep link test', url 'myapp://profile/123'"
```

- Sends notification → Waits for banner to appear → Taps top area where banner shows
- Simple and reliable for most testing scenarios
- Configurable tap delay (default: 1 second)

**2. Lock Screen Method**

```
"Send notification and tap using lock screen method: title 'Test', body 'Deep link test', url 'myapp://profile/123'"
```

- Locks device → Sends notification → Taps notification on lock screen
- Most reliable since lock screen notifications persist until tapped

**3. Custom Timing**

```
"Send notification and tap with tapDelay 2.0: title 'Test', body 'Deep link test', url 'myapp://profile/123'"
```

- Adjust the delay before tapping if notifications take longer to appear

## ⚙️ Configuration

### Environment Variables

```bash
# Simulator Configuration
RN_DEFAULT_DEVICE="iPhone 15 Pro"           # Default simulator device
RN_DEFAULT_IOS_VERSION="17.0"               # Default iOS version
RN_SIMULATOR_TIMEOUT="30000"                # Boot/shutdown timeout (ms)
RN_AUTO_BOOT="true"                         # Auto-boot on session create (deprecated - use autoBoot parameter instead)

# React Native Configuration
RN_BUNDLE_ID=""                             # Default bundle ID for app launching (e.g., com.mycompany.myapp)

# Artifacts Configuration
SCREENSHOT_PATH="/path/to/screenshots"       # Directory for screenshot files (required)
VIDEO_PATH="/path/to/videos"                # Directory for video recording files (required)

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
"Create iPhone 15 Pro simulator, launch MyApp, take screenshot, tap coordinates (200, 400), input text 'test@example.com', press enter key, take another screenshot to verify results"
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
