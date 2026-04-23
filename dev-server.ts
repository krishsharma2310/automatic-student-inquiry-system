import { createServer } from './server';

async function startDevServer() {
  const app = await createServer();

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dev server running on http://localhost:${PORT}`);
  });
}

startDevServer();

