import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: process.env.DEEPSEEK_KEY,
});

export async function POST(request) {
  try {
    const { message } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "deepseek-r1:1.5b",
      messages: [
        {
          role: "system",
          content:
            "You are a dental appointment booking assistant. Be concise and helpful.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    // Extract the actual response by removing the <think> part
    const fullResponse = completion.choices[0].message.content;
    const cleanedResponse = fullResponse.replace(/<think>.*?<\/think>\s*/s, '').trim();
    
    return NextResponse.json({
      reply: cleanedResponse,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
