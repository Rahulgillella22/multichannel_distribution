require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { TOOL_DEFINITIONS, handleToolCall } = require('./tools.js');
const { startMockWebhookServer } = require('../controllers/MockWebhookController.js');
const { initScheduler } = require('../services/SchedulerService.js');

async function main() {
    // Start mock webhook server (port 3001)
    startMockWebhookServer();

    // Initialize scheduler and catch up missed jobs
    await initScheduler();

    // Create MCP server
    const server = new Server(
        { name: 'grabon-deal-distributor', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    // List all tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOL_DEFINITIONS
    }));

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            return await handleToolCall(name, args);
        } catch (error) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: true, message: error.message }, null, 2) }],
                isError: true
            };
        }
    });

    // Connect via stdio (Claude Desktop communicates through stdin/stdout)
    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stderr.write('GrabOn MCP server started — connected to Claude Desktop via stdio\n');
}

main().catch((error) => {
    process.stderr.write(`Fatal error: ${error.message}\n`);
    process.exit(1);
});
