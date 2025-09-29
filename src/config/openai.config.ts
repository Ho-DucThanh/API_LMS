import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

const response = openai.responses.create({
  model: 'gpt-4.1',
  input: 'write a haiku about ai',
  store: true,
});

response.then((result) => console.log(result.output_text));
