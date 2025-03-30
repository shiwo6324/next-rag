import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { embed } from 'ai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer';

const { SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY } = process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

// const { data, error } = await supabase.from('documents').select('*');

const perplexity = createOpenAI({
  baseURL: 'https://api.vveai.com/v1/',
  apiKey: OPENAI_API_KEY,
});

const f1Data = [
  'https://en.wikipedia.org/wiki/Formula_One',
  // 'https://en.wikipedia.org/wiki/Lewis_Hamilton',
  // 'https://en.wikipedia.org/wiki/Max_Verstappen',
  // 'https://en.wikipedia.org/wiki/Charles_Leclerc',
  // 'https://en.wikipedia.org/wiki/Carlos_Sainz',
  // 'https://en.wikipedia.org/wiki/George_Russell',
];

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const loadSampleData = async () => {
  for await (const url of f1Data) {
    try {
      const content = await scrapePage(url);
      const chunks = await splitter.splitText(content);

      for await (const chunk of chunks) {
        const embedding = await embed({
          model: perplexity.embedding('text-embedding-3-small'),
          value: chunk,
        });

        const vector = embedding.embedding;
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      continue;
    }
  }
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    },
    gotoOptions: {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    },
    evaluate: async (page) => {
      const resp = await page.evaluate(() => document.body.innerHTML);

      return resp;
    },
  });

  const docs = await loader.load();
  return docs[0].pageContent.replace(/<[^>]*>?/g, '');
};

loadSampleData();
