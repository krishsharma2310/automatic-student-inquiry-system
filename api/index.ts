/**
 * API Entry Point
 * ------------------------------------------------------------------
 * This file acts as a thin HTTP wrapper around the main server
 * instance created in `server.ts`.
 *
 * Responsibilities:
 * - Log incoming API requests
 * - Initialize the server (lazy-loaded)
 * - Forward request/response objects
 * - Handle top-level fatal errors
 */

import { createServer } from '../server';

/**
 * Default API handler (Serverless-compatible)
 */
export default async function handler(req, res) {
  /* --------------------------------------------------------------
   * Request Logging
   * -------------------------------------------------------------- */
  console.log(`[API] ${req.method} ${req.url}`);

  try {
    /**
     * Create or retrieve the application server
     * (Typically an Express / Fastify / Hono instance)
     */
    const app = await createServer();

    /**
     * Delegate request handling to the server
     */
    return app(req, res);
  } catch (error) {
    /* --------------------------------------------------------------
     * Fatal Error Handling
     * -------------------------------------------------------------- */
    console.error('[API ERROR]', error);

    return res.status(500).json({
      error: 'Internal Server Error',
      // Expose message only for debugging; safe for internal APIs
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}