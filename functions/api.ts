/**
 * Serverless HTTP Adapter
 * ------------------------------------------------------------------
 * Wraps the application server using `serverless-http` and
 * caches the handler to avoid cold-start reinitialization.
 *
 * Suitable for:
 * - AWS Lambda
 * - Netlify Functions
 * - Vercel (Node runtime)
 */

import serverless from 'serverless-http';
import { createServer } from '../server';

/* ------------------------------------------------------------------
 * Cached Handler (persists across warm invocations)
 * ------------------------------------------------------------------ */

let cachedHandler: ReturnType<typeof serverless> | undefined;

/* ------------------------------------------------------------------
 * Lambda / Serverless Entry Point
 * ------------------------------------------------------------------ */

export const handler = async (event: unknown, context: unknown) => {
  /**
   * Lazily initialize the server only once per container
   * to reduce cold-start cost.
   */
  if (!cachedHandler) {
    const app = await createServer();
    cachedHandler = serverless(app);
  }

  /**
   * Delegate the event to the cached handler
   */
  return cachedHandler(event, context);
};