import { createServer } from './server';
import net from 'net';

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, '0.0.0.0', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

async function startDevServer() {
  const app = await createServer();

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const preferredPort = parseInt(process.env.PORT || '3000', 10);
  const PORT = await findAvailablePort(preferredPort);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dev server running on http://localhost:${PORT}`);
  });
}

startDevServer();

