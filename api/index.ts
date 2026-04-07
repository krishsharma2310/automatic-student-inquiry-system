import { createServer } from '../server';

export default async (req, res) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  try {
    const app = await createServer();
    return app(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
