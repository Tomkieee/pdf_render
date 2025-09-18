/// <reference types="@cloudflare/workers-types" />

import worker from './worker.js';

type WorkerModule = {
  fetch: (request: Request, env: Record<string, unknown>, ctx: ExecutionContext) => Promise<Response>;
};

const runtimeWorker = worker as WorkerModule;

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    return runtimeWorker.fetch(request, env, ctx);
  },
};
