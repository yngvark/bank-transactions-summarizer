import path from "path";
import OpenAI from "openai";
const openai = new OpenAI();

/**
 * Health check endpoint
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const handler = async (req, res) => {
  const hasApiKey = "OPENAI_API_KEY" in process.env;

  if (!hasApiKey) {
    res
        .status(500)
        .send("Missing OPENAI_API_KEY. Please set it in the .env file.");

    return
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a helpful assistant." }],
      model: "gpt-3.5-turbo",
    });
    console.log(completion.choices[0]);

    const data = {
      data: completion.choices[0]
    }

    res.send(data)
  } catch (error) {
    console.log(error);
    res
        .status(500)
        .send(error)
  }
};

export default handler;
