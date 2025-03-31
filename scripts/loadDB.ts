import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer';

const { SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, OPENAI_BASE_URL } =
  process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const openai = createOpenAI({
  baseURL: OPENAI_BASE_URL,
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
  chunkSize: 512, // 每个chunk最多512个字符
  chunkOverlap: 100, // 每个chunk重叠100个字符
});

const loadSampleData = async () => {
  for await (const url of f1Data) {
    try {
      // 步骤 1: 抓取网页内容
      console.log(`Scraping ${url}...`);
      const content = await scrapePage(url);
      console.log(`Splitting content from ${url}...`);

      // 步骤 2: 将抓取到的内容分割成文本块
      const chunks = await splitter.splitText(content);
      console.log(`Found ${chunks.length} chunks for ${url}.`);

      // 步骤 3: 遍历每个文本块
      for await (const chunk of chunks) {
        console.log(`Embedding chunk...`);
        // 步骤 3.1: 为当前文本块生成嵌入向量
        const embedding = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: chunk, // 需要生成嵌入的文本块
        });

        // 获取生成的嵌入向量
        const vector = embedding.embedding;

        console.log(`Inserting chunk into Supabase...`);
        // 步骤 3.2: 将文本块和其对应的嵌入向量插入到 Supabase 数据库的 'documents' 表中
        const { data, error } = await supabase.from('documents').insert({
          embedding: vector, // 嵌入向量
          content: chunk, // 原始文本块
        });

        // 检查插入操作是否出错
        if (error) {
          console.error(`Error inserting document:`, error);
        } else {
          console.log(`Successfully inserted chunk.`);
        }
      }
      console.log(`Finished processing ${url}.`);
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      continue;
    }
  }
  console.log('Sample data loading complete.');
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
  return docs[0].pageContent.replace(/<[^>]*>?/gm, '');
};

loadSampleData();
