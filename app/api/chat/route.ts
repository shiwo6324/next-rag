import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { embed, streamText } from 'ai';

const { SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, OPENAI_BASE_URL } =
  process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const openai = createOpenAI({
  baseURL: OPENAI_BASE_URL,
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    const embedding = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: lastMessage.content,
    });

    try {
      const { data: embeddings, error: embeddingsError } = await supabase.rpc(
        'match_documents',
        {
          query_embedding: embedding.embedding,
          match_count: 5,
          match_threshold: 0.75,
        }
      );

      console.log({ embeddings });

      if (embeddingsError) {
        console.error('Supabase RPC Error:', embeddingsError);
      }

      const context = embeddings
        ?.map((embedding: { content: string }) => embedding.content)
        .join('\n');

      console.log({ context });

      const safeContext = context ?? 'No context found.';

      const template = {
        role: 'system',
        content: `You are a knowledgeable Formula 1 expert and enthusiast. Your role is to provide accurate and engaging information about F1 racing.

Instructions:
- Base your answers strictly on the provided context
- Answer in fluent Chinese (Mandarin)
- Be concise yet informative
- Use proper F1 terminology
- If information is not in the context, politely indicate that
- Focus on factual accuracy
- Maintain a professional and authoritative tone

Context:
${safeContext}

User Question:
${lastMessage.content}`,
      };

      const result = streamText({
        model: openai('gpt-4o-mini'),
        messages: [template, ...messages],
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error('Error in match_documents:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
