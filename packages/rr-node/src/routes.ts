/**
 * HTTP route handlers
 */

import { IncomingMessage, ServerResponse } from 'http';
import { RecipeStore, CreateRecipeInput } from '@rr-system/store';
import { DiscoveryService } from '@rr-system/discover';
import { ReceiptEngine, SubmitReceiptInput } from '@rr-system/receipts';

export class RouteHandler {
  constructor(
    private store: RecipeStore,
    private discovery: DiscoveryService,
    private receipts: ReceiptEngine
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    try {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Route matching
      if (method === 'POST' && url.pathname === '/recipes') {
        await this.createRecipe(req, res);
      } else if (method === 'GET' && url.pathname.startsWith('/recipes/')) {
        await this.getRecipe(req, res, url);
      } else if (method === 'GET' && url.pathname === '/discover') {
        await this.discover(req, res, url);
      } else if (method === 'GET' && url.pathname === '/discover/step') {
        await this.discoverStep(req, res, url);
      } else if (method === 'POST' && url.pathname === '/receipts') {
        await this.submitReceipt(req, res);
      } else if (method === 'GET' && url.pathname.startsWith('/receipts/summary/')) {
        await this.getReceiptSummary(req, res, url);
      } else if (method === 'GET' && url.pathname === '/health') {
        this.sendJSON(res, 200, { status: 'ok' });
      } else {
        this.sendJSON(res, 404, { error: 'Not found' });
      }
    } catch (error: any) {
      console.error('Route error:', error);
      this.sendJSON(res, 500, { error: error.message });
    }
  }

  private async createRecipe(req: IncomingMessage, res: ServerResponse) {
    const body = await this.readBody(req);
    const input: CreateRecipeInput = JSON.parse(body);
    const recipe = await this.store.createRecipe(input);
    this.sendJSON(res, 201, recipe);
  }

  private async getRecipe(req: IncomingMessage, res: ServerResponse, url: URL) {
    const parts = url.pathname.split('/');
    const recipeId = parts[2];

    if (parts.length === 3) {
      // GET /recipes/:id
      const recipe = await this.store.getRecipe(recipeId);
      if (!recipe) {
        this.sendJSON(res, 404, { error: 'Recipe not found' });
        return;
      }
      this.sendJSON(res, 200, recipe);
    } else if (parts.length === 4 && parts[3] === 'steps') {
      // GET /recipes/:id/steps
      const steps = await this.store.getSteps(recipeId);
      this.sendJSON(res, 200, steps);
    } else if (parts.length === 5 && parts[3] === 'steps') {
      // GET /recipes/:id/steps/:step_id
      const stepId = parts[4];
      const step = await this.store.getStep(recipeId, stepId);
      if (!step) {
        this.sendJSON(res, 404, { error: 'Step not found' });
        return;
      }
      this.sendJSON(res, 200, step);
    } else {
      this.sendJSON(res, 404, { error: 'Not found' });
    }
  }

  private async discover(req: IncomingMessage, res: ServerResponse, url: URL) {
    const query = url.searchParams.get('q') || undefined;
    const tags = url.searchParams.get('tags')?.split(',') || undefined;
    const topK = parseInt(url.searchParams.get('top_k') || '5', 10);

    const results = await this.discovery.searchRecipes({
      query,
      tags,
      topK,
    });

    this.sendJSON(res, 200, { results });
  }

  private async discoverStep(req: IncomingMessage, res: ServerResponse, url: URL) {
    const query = url.searchParams.get('q');
    const topK = parseInt(url.searchParams.get('top_k') || '5', 10);

    if (!query) {
      this.sendJSON(res, 400, { error: 'Query parameter "q" is required' });
      return;
    }

    const results = await this.discovery.searchSteps({ query, topK });
    this.sendJSON(res, 200, { results });
  }

  private async submitReceipt(req: IncomingMessage, res: ServerResponse) {
    const body = await this.readBody(req);
    const input: SubmitReceiptInput = JSON.parse(body);
    const receipt = await this.receipts.submitReceipt(input);
    this.sendJSON(res, 201, receipt);
  }

  private async getReceiptSummary(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ) {
    const parts = url.pathname.split('/');
    const targetId = parts[3];
    const targetType = (url.searchParams.get('type') || 'recipe') as 'recipe' | 'step';

    const summary = await this.receipts.getSummary(targetId, targetType);
    if (!summary) {
      this.sendJSON(res, 404, { error: 'Summary not found' });
      return;
    }
    this.sendJSON(res, 200, summary);
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  private sendJSON(res: ServerResponse, status: number, data: any) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }
}
