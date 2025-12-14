import { Request, Response, RequestHandler } from 'express';
import OpenAI from 'openai';

const handler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const openai = new OpenAI();

  const hasApiKey = 'OPENAI_API_KEY' in process.env;

  if (!hasApiKey) {
    res
      .status(500)
      .send('Missing OPENAI_API_KEY. Please set it in the .env file.');
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
      model: 'gpt-3.5-turbo',
    });
    console.log(completion.choices[0]);

    const response = {
      data: completion.choices[0],
    };

    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

export default handler;
