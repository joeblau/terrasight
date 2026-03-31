import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { COUNTY_FIPS } from "@/lib/arcgis/config"

const SYSTEM_PROMPT = `You are a disaster response AI assistant for Terrasight, a GIS platform monitoring 14 Florida counties during hurricane response. You help emergency management officials understand situational data.

Available counties: ${Object.entries(COUNTY_FIPS).map(([fips, name]) => `${name} (${fips})`).join(", ")}

When asked a question, respond with a brief, operational answer. Use specific data when available. Keep responses under 150 words. Use the tone of a situation report, not a chatbot.

If the user provides context data, use it to inform your answer. If not, provide general guidance based on the question.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const { query, context } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing query parameter" },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey })

    const userMessage = context
      ? `Question: ${query}\n\nCurrent data context:\n${context}`
      : `Question: ${query}`

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""

    return NextResponse.json({ answer: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI query failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
