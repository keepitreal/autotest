const { spawn } = require("child_process");

async function testCursorLikeBehavior() {
  console.log("Testing Cursor-like MCP behavior...");

  const server = spawn(
    "/opt/homebrew/bin/node",
    ["/Users/darionwelch/cb/autotest/dist/index.js"],
    {
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let messageId = 1;
  let responses = [];

  server.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      try {
        if (line.startsWith("{")) {
          const response = JSON.parse(line);
          responses.push(response);
          console.log("Received:", JSON.stringify(response, null, 2));
        }
      } catch (e) {
        console.log("Non-JSON output:", line);
      }
    });
  });

  server.stderr.on("data", (data) => {
    console.log("STDERR:", data.toString());
  });

  server.on("close", (code) => {
    console.log("Server closed with code:", code);
  });

  server.on("error", (error) => {
    console.log("Server error:", error);
  });

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Request timeout"));
      }, 5000);

      const originalLength = responses.length;
      const checkResponse = () => {
        if (responses.length > originalLength) {
          clearTimeout(timeout);
          resolve(responses[responses.length - 1]);
        } else {
          setTimeout(checkResponse, 100);
        }
      };

      server.stdin.write(JSON.stringify(message) + "\n");
      checkResponse();
    });
  }

  try {
    // Initialize
    await sendMessage({
      jsonrpc: "2.0",
      id: messageId++,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "cursor", version: "1.0.0" },
      },
    });

    // List tools
    await sendMessage({
      jsonrpc: "2.0",
      id: messageId++,
      method: "tools/list",
      params: {},
    });

    // Multiple rapid tool calls like Cursor might do
    console.log("Testing rapid tool calls...");
    for (let i = 0; i < 3; i++) {
      await sendMessage({
        jsonrpc: "2.0",
        id: messageId++,
        method: "tools/call",
        params: {
          name: "mcp_server_healthcheck",
          arguments: {},
        },
      });
    }

    console.log("All tests completed successfully!");
  } catch (error) {
    console.log("Test failed:", error.message);
  }

  server.kill();
}

testCursorLikeBehavior();
