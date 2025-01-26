import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { userMessage, aiResponse } = await req.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that generates very short (2-4 words) titles for conversations. The title should capture the main topic or intent of the conversation.",
      },
      {
        role: "user",
        content: `Generate a very short (2-4 words) title for this conversation:\n\nUser: ${userMessage}\n\nAssistant: ${aiResponse}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 10,
  });

  return new Response(response.choices[0].message.content);
} 