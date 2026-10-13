
import "dotenv/config";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const questions = [
  "Which farmer supplied the most sugarcane, and what is the total pending payment?",
  "Which farmer has the highest pending payment?",
  "What is the total number of farmers?",
  "Is there any farmer with pending payment greater than 100,000 INR? If yes, who are they?"
];

const client = new Client({
  name: "sanjivani-farmer-client",
  version: "1.0.0"
});

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["node_modules/tsx/dist/cli.mjs", "server.ts"]
  });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    console.log("Available tools:", tools.map(t => t.name));

    const result = await client.callTool({
      name: "get_farmer_report",
      arguments: {}
    });

    const farmerData = result.content
      .map(item => item.type === "text" ? item.text : "")
      .join("\n");

    for (const question of questions) {
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions:
          "Answer using only the supplied farmer data. " +
          "Calculate totals carefully. Use INR for money.",
        input: `Question: ${question}\nFarmer data: ${farmerData}`
      });

      console.log("\nQuestion:", question);
      console.log("\nAI Answer:", response.output_text);
      console.log("\n------------------------------");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

main();
