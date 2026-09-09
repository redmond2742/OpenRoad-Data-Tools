import { createServer, type Server } from "http";
import type { Express } from "express";

/**
 * OpenRoad Data Tools runs entirely in the browser — points live in
 * localStorage and CSV export happens client-side — so the dev server only
 * has to hand back an HTTP server for Vite's middleware to attach to.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  return createServer(app);
}
