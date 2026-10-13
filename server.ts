
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import pg from "pg";

const pool = new pg.Pool();

serveStdio(() => {
  const server = new McpServer({
    name: "sanjivani-farmer-server",
    version: "1.0.0"
  });

  server.registerTool(
    "get_farmer_report",
    {
      description: "Retrieve farmer production and payment records",
      inputSchema: z.object({})
    },
    async () => {
      const result = await pool.query(`
        SELECT id, name, village, sugarcane_tons,
               amount_paid, payment_pending
        FROM farmers
        ORDER BY sugarcane_tons DESC
      `);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result.rows)
        }]
      };
    }
  );

  return server;
});
