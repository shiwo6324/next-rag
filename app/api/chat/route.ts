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

    console.log({ embedding: embedding.embedding });
    try {
      const { data: embeddings, error: embeddingsError } = await supabase.rpc(
        'match_documents',
        {
          query_embedding: embedding.embedding,
          match_count: 5,
          match_threshold: 0.75,
        }
      );

      if (embeddingsError) {
        console.error('Supabase RPC Error:', embeddingsError);
      }

      const context = embeddings
        ?.map((embedding: { text: string }) => embedding.text)
        .join('\n');

      const safeContext = context ?? 'No context found.';

      const template = {
        role: 'system',
        content: `
        You are an AI assistant.who knows everything about the formula 1.
        You are given a question and a context.
        You need to answer the question based on the context.
        You need to answer in Chinese.
        You need to answer in a concise and professional manner.
        ------------
        start of the context:
        ${safeContext}
        ------------
        question:
        ${lastMessage.content}
        ------------
        `,
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
