import { spawn } from "child_process";
import { idb } from "../../utils/idb";

// Removed unused CONTINUE_BUTTON_POSITIONS - using calculated coordinates instead

/**
 * Get screen dimensions for the current simulator
 */
async function getScreenDimensions(
  udid: string
): Promise<{ width: number; height: number }> {
  try {
    // Try to get device info from simctl
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`xcrun simctl list devices -j`);
    const devices = JSON.parse(stdout);

    // Find our device in the list to get its type
    let deviceName = "Unknown";
    for (const [_runtime, deviceList] of Object.entries(devices.devices)) {
      if (Array.isArray(deviceList)) {
        const device = deviceList.find((d: any) => d.udid === udid);
        if (device) {
          deviceName = device.name;
          break;
        }
      }
    }

    // Common screen dimensions (logical points, not pixels)
    const screenSizes: { [key: string]: { width: number; height: number } } = {
      "iPhone 15 Pro": { width: 393, height: 852 },
      "iPhone 15 Pro Max": { width: 430, height: 932 },
      "iPhone 15": { width: 393, height: 852 },
      "iPhone 15 Plus": { width: 430, height: 932 },
      "iPhone 14 Pro": { width: 393, height: 852 },
      "iPhone 14": { width: 390, height: 844 },
      "iPhone 13": { width: 390, height: 844 },
      "iPad Air": { width: 820, height: 1180 },
      "iPad Pro": { width: 1024, height: 1366 },
    };

    // Find matching screen size
    for (const [name, size] of Object.entries(screenSizes)) {
      const modelName = name.split(" ")[1];
      if (modelName && deviceName.includes(modelName)) {
        // Match by model
        return size;
      }
    }

    // Default fallback
    return { width: 393, height: 852 };
  } catch (error) {
    console.warn("Failed to get screen dimensions, using default:", error);
    return { width: 393, height: 852 };
  }
}

/**
 * Calculate Continue button coordinates based on device screen size
 * Uses 50% width and 90% height as specified - works universally across all devices
 */
async function getContinueButtonCoordinates(
  udid: string
): Promise<{ x: number; y: number }> {
  try {
    const dimensions = await getScreenDimensions(udid);

    // Use 50% width and 90% height for Continue button (universal positioning)
    const x = Math.round(dimensions.width * 0.5); // 50% of width
    const y = Math.round(dimensions.height * 0.9); // 90% of height

    console.log(
      `Continue button calculated at (${x}, ${y}) for ${dimensions.width}x${dimensions.height} screen`
    );

    return { x, y };
  } catch (error) {
    console.warn(
      "Failed to calculate adaptive coordinates, using fallback:",
      error
    );
    // Fallback coordinates (50% of 393x852)
    return { x: 197, y: 767 };
  }
}

/**
 * Take a screenshot to help identify Face ID dialog elements
 * Returns the screenshot path for manual coordinate identification
 */
export async function debugFaceIdDialog(): Promise<{
  success: boolean;
  screenshotPath?: string;
  message: string;
}> {
  try {
    console.log("Taking screenshot of Face ID dialog for debugging...");

    // Get the current simulator
    const { SimulatorManager } = await import(
      "../../managers/SimulatorManager"
    );
    const simulatorManager = new SimulatorManager();
    const currentSim = await simulatorManager.getCurrentSimulator();

    if (!currentSim) {
      throw new Error("No active simulator found");
    }

    // Take screenshot
    const screenshotPath = await idb.screenshot(currentSim.udid);

    return {
      success: true,
      screenshotPath,
      message: `Screenshot saved to: ${screenshotPath}\nPlease examine the image to identify the Continue button coordinates, then use those coordinates to improve the Face ID simulation.`,
    };
  } catch (error) {
    console.error("Failed to take Face ID debug screenshot:", error);
    return {
      success: false,
      message: `Failed to take debug screenshot: ${error}`,
    };
  }
}

/**
 * Simulate a matching Face ID scan
 * First taps the Continue button at 50% width, 90% height, then uses the keyboard shortcut ⌥⌘M
 */
export async function simulateMatchingFace(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Simulating matching Face ID...");

    // Get the current simulator
    const { SimulatorManager } = await import(
      "../../managers/SimulatorManager"
    );
    const simulatorManager = new SimulatorManager();
    const currentSim = await simulatorManager.getCurrentSimulator();

    if (!currentSim) {
      throw new Error("No active simulator found");
    }

    // Step 1: Wait for dialog to load
    console.log("Waiting for Face ID dialog to load...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Calculate and tap the Continue button (50% width, 90% height)
    console.log(
      "Calculating Continue button coordinates (50% width, 90% height)..."
    );
    const buttonCoords = await getContinueButtonCoordinates(currentSim.udid);

    console.log(
      `Tapping Continue button at (${buttonCoords.x}, ${buttonCoords.y})...`
    );
    await idb.tap(currentSim.udid, buttonCoords.x, buttonCoords.y);

    // Step 3: Wait for Face ID prompt to appear
    console.log("Waiting for Face ID prompt...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Send the keyboard shortcut for matching Face ID
    console.log("Sending matching Face ID keyboard shortcut...");
    const process = spawn(
      "osascript",
      [
        "-e",
        'tell application "Simulator" to activate',
        "-e",
        'tell application "System Events" to key code 46 using {option down, command down}',
      ],
      { stdio: "pipe" }
    );

    await new Promise<void>((resolve, reject) => {
      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      process.on("error", reject);
    });

    console.log("Successfully simulated matching Face ID");
    return {
      success: true,
      message: `Matching Face ID simulation completed!\nContinue button tapped at (${buttonCoords.x}, ${buttonCoords.y}) + Face ID matched`,
    };
  } catch (error) {
    console.error("Error simulating matching Face ID:", error);
    return {
      success: false,
      message: `Failed to simulate matching Face ID: ${error}`,
    };
  }
}

/**
 * Simulate a non-matching Face ID scan
 * First taps the Continue button at 50% width, 90% height, then uses the keyboard shortcut ⌥⌘N
 */
export async function simulateNonMatchingFace(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Simulating non-matching Face ID...");

    // Get the current simulator
    const { SimulatorManager } = await import(
      "../../managers/SimulatorManager"
    );
    const simulatorManager = new SimulatorManager();
    const currentSim = await simulatorManager.getCurrentSimulator();

    if (!currentSim) {
      throw new Error("No active simulator found");
    }

    // Step 1: Wait for dialog to load
    console.log("Waiting for Face ID dialog to load...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Calculate and tap the Continue button (50% width, 90% height)
    console.log(
      "Calculating Continue button coordinates (50% width, 90% height)..."
    );
    const buttonCoords = await getContinueButtonCoordinates(currentSim.udid);

    console.log(
      `Tapping Continue button at (${buttonCoords.x}, ${buttonCoords.y})...`
    );
    await idb.tap(currentSim.udid, buttonCoords.x, buttonCoords.y);

    // Step 3: Wait for Face ID prompt to appear
    console.log("Waiting for Face ID prompt...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Send the keyboard shortcut for non-matching Face ID
    console.log("Sending non-matching Face ID keyboard shortcut...");
    const process = spawn(
      "osascript",
      [
        "-e",
        'tell application "Simulator" to activate',
        "-e",
        'tell application "System Events" to key code 45 using {option down, command down}',
      ],
      { stdio: "pipe" }
    );

    await new Promise<void>((resolve, reject) => {
      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      process.on("error", reject);
    });

    console.log("Successfully simulated non-matching Face ID");
    return {
      success: true,
      message: `Non-matching Face ID simulation completed!\nContinue button tapped at (${buttonCoords.x}, ${buttonCoords.y}) + Face ID failed`,
    };
  } catch (error) {
    console.error("Error simulating non-matching Face ID:", error);
    return {
      success: false,
      message: `Failed to simulate non-matching Face ID: ${error}`,
    };
  }
}

/**
 * Simulate Touch ID with matching fingerprint
 * First taps the Continue button at 50% width, 90% height, then uses the keyboard shortcut ⌥⌘M
 */
export async function simulateMatchingTouchId(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Simulating matching Touch ID...");

    // Get the current simulator
    const { SimulatorManager } = await import(
      "../../managers/SimulatorManager"
    );
    const simulatorManager = new SimulatorManager();
    const currentSim = await simulatorManager.getCurrentSimulator();

    if (!currentSim) {
      throw new Error("No active simulator found");
    }

    // Step 1: Wait for dialog to load
    console.log("Waiting for Touch ID dialog to load...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Calculate and tap the Continue button (50% width, 90% height)
    console.log(
      "Calculating Continue button coordinates (50% width, 90% height)..."
    );
    const buttonCoords = await getContinueButtonCoordinates(currentSim.udid);

    console.log(
      `Tapping Continue button at (${buttonCoords.x}, ${buttonCoords.y})...`
    );
    await idb.tap(currentSim.udid, buttonCoords.x, buttonCoords.y);

    // Step 3: Wait for Touch ID prompt to appear
    console.log("Waiting for Touch ID prompt...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Send the keyboard shortcut for matching Touch ID
    console.log("Sending matching Touch ID keyboard shortcut...");
    const process = spawn(
      "osascript",
      [
        "-e",
        'tell application "Simulator" to activate',
        "-e",
        'tell application "System Events" to key code 46 using {option down, command down}',
      ],
      { stdio: "pipe" }
    );

    await new Promise<void>((resolve, reject) => {
      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      process.on("error", reject);
    });

    console.log("Successfully simulated matching Touch ID");
    return {
      success: true,
      message: `Matching Touch ID simulation completed!\nContinue button tapped at (${buttonCoords.x}, ${buttonCoords.y}) + Touch ID matched`,
    };
  } catch (error) {
    console.error("Error simulating matching Touch ID:", error);
    return {
      success: false,
      message: `Failed to simulate matching Touch ID: ${error}`,
    };
  }
}

/**
 * Simulate Touch ID with non-matching fingerprint
 * First taps the Continue button at 50% width, 90% height, then uses the keyboard shortcut ⌥⌘N
 */
export async function simulateNonMatchingTouchId(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Simulating non-matching Touch ID...");

    // Get the current simulator
    const { SimulatorManager } = await import(
      "../../managers/SimulatorManager"
    );
    const simulatorManager = new SimulatorManager();
    const currentSim = await simulatorManager.getCurrentSimulator();

    if (!currentSim) {
      throw new Error("No active simulator found");
    }

    // Step 1: Wait for dialog to load
    console.log("Waiting for Touch ID dialog to load...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Calculate and tap the Continue button (50% width, 90% height)
    console.log(
      "Calculating Continue button coordinates (50% width, 90% height)..."
    );
    const buttonCoords = await getContinueButtonCoordinates(currentSim.udid);

    console.log(
      `Tapping Continue button at (${buttonCoords.x}, ${buttonCoords.y})...`
    );
    await idb.tap(currentSim.udid, buttonCoords.x, buttonCoords.y);

    // Step 3: Wait for Touch ID prompt to appear
    console.log("Waiting for Touch ID prompt...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Send the keyboard shortcut for non-matching Touch ID
    console.log("Sending non-matching Touch ID keyboard shortcut...");
    const process = spawn(
      "osascript",
      [
        "-e",
        'tell application "Simulator" to activate',
        "-e",
        'tell application "System Events" to key code 45 using {option down, command down}',
      ],
      { stdio: "pipe" }
    );

    await new Promise<void>((resolve, reject) => {
      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      process.on("error", reject);
    });

    console.log("Successfully simulated non-matching Touch ID");
    return {
      success: true,
      message: `Non-matching Touch ID simulation completed!\nContinue button tapped at (${buttonCoords.x}, ${buttonCoords.y}) + Touch ID failed`,
    };
  } catch (error) {
    console.error("Error simulating non-matching Touch ID:", error);
    return {
      success: false,
      message: `Failed to simulate non-matching Touch ID: ${error}`,
    };
  }
}
