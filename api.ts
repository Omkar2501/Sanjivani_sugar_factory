
import "dotenv/config";
import express from "express";
import cors from "cors";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import OpenAI from "openai";

const app = express();
const PORT = 3000;

app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (_req, res) => {
  res.send("Sanjivani Farmer AI API is running.");
});

app.post("/api/ask", async (req, res) => {
  const question = req.body?.question;

  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Please enter a question." });
    return;
  }

  const client = new Client({
    name: "sanjivani-farmer-api",
    version: "1.0.0"
  });

  try {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["node_modules/tsx/dist/cli.mjs", "server.ts"]
    });

    await client.connect(transport);

    const result = await client.callTool({
      name: "get_farmer_report",
      arguments: {}
    });

    if (result.isError) {
      throw new Error("MCP farmer report tool failed.");
    }

    const farmerData = result.content
      .map(item => item.type === "text" ? item.text : "")
      .join("\n");

    if (!farmerData.trim()) {
      throw new Error("No farmer data returned by MCP.");
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "Answer using only the supplied farmer data. " +
        "Do not invent farmer records or payment amounts. " +
        "Calculate carefully and use INR for money.",
      input: `Question: ${question.trim()}\nFarmer data:\n${farmerData}`
    });

    res.json({ answer: response.output_text });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({
      error: "Unable to process the question. Check the backend terminal."
    });
  } finally {
    try {
      await client.close();
    } catch (error) {
      console.error("MCP cleanup error:", error);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Farmer API running at http://localhost:${PORT}`);
});
