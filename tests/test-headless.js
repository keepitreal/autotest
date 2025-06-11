// Test script to verify headless mode functionality
const { headlessManager } = require("./dist/utils/headless");

async function testHeadlessMode() {
  console.log("🔄 Testing headless mode functionality...\n");

  // Test headless detection
  console.log("📋 Headless Configuration:");
  console.log(`  - Enabled: ${headlessManager.isHeadlessEnabled()}`);
  console.log(`  - Mode: ${headlessManager.getHeadlessMode()}`);
  console.log(`  - HEADLESS_MODE env: "${process.env.HEADLESS_MODE}"`);
  console.log(
    `  - HEADLESS_MODE_TYPE env: "${process.env.HEADLESS_MODE_TYPE}"`
  );

  // Test environment variable detection
  console.log("\n🌍 Environment Variables:");
  console.log(`  - HEADLESS_MODE: "${process.env.HEADLESS_MODE}"`);
  console.log(`  - HEADLESS_MODE_TYPE: "${process.env.HEADLESS_MODE_TYPE}"`);
  console.log(`  - SIMULATOR_HEADLESS: "${process.env.SIMULATOR_HEADLESS}"`);
  console.log(
    `  - IOS_SIMULATOR_HEADLESS: "${process.env.IOS_SIMULATOR_HEADLESS}"`
  );

  // Test headless setup
  if (headlessManager.isHeadlessEnabled()) {
    console.log("\n🚀 Setting up headless mode...");
    try {
      const result = await headlessManager.setup();
      console.log(`  - Success: ${result.success}`);
      console.log(`  - Message: ${result.message}`);
      if (result.environment) {
        console.log("  - Environment vars:");
        Object.entries(result.environment).forEach(([key, value]) => {
          console.log(`    ${key}: "${value}"`);
        });
      }
    } catch (error) {
      console.error("  - Error:", error.message);
    }
  } else {
    console.log("\n✅ Headless mode is disabled - running in GUI mode");
  }

  console.log("\n✅ Headless mode test completed!");
}

testHeadlessMode().catch(console.error);
