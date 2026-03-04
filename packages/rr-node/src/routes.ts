import { IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, resolve, normalize } from 'path';
import { fileURLToPath } from 'url';
import { RecipeStore, CreateRecipeInput } from '@agent-cookbook/store';
import { DiscoveryService } from '@agent-cookbook/discover';
import { ReceiptEngine, SubmitReceiptInput } from '@agent-cookbook/receipts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

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
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

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
      } else if (method === 'GET' && url.pathname === '/api/stats') {
        await this.getStats(req, res);
      } else if (method === 'GET' && url.pathname === '/api/latest') {
        await this.getLatestRecipe(req, res);
      } else if (method === 'GET') {
        await this.serveStatic(req, res, url);
      } else {
        this.sendJSON(res, 404, { error: 'Not found' });
      }
    } catch (error: any) {
      console.error('Route error:', error);
      this.sendJSON(res, 500, { error: error.message });
    }
  }

  private async getStats(_req: IncomingMessage, res: ServerResponse) {
    const recipeIds = await this.store.listRecipes();
    const recipeDates: string[] = [];

    for (const id of recipeIds) {
      const recipe = await this.store.getRecipe(id);
      if (recipe?.created_at) {
        recipeDates.push(recipe.created_at.split('T')[0]);
      }
    }

    let totalReceipts = 0;
    for (const id of recipeIds) {
      const recipe = await this.store.getRecipe(id);
      if (recipe?.receipt_summary) {
        totalReceipts += recipe.receipt_summary.total_runs;
      }
    }

    this.sendJSON(res, 200, {
      total_recipes: recipeIds.length,
      total_receipts: totalReceipts,
      recipe_dates: recipeDates,
    });
  }

  private async getLatestRecipe(_req: IncomingMessage, res: ServerResponse) {
    const recipeIds = await this.store.listRecipes();
    if (recipeIds.length === 0) {
      this.sendJSON(res, 200, { recipe: null });
      return;
    }

    let latest = null;
    let latestDate = '';

    for (const id of recipeIds) {
      const recipe = await this.store.getRecipe(id);
      if (recipe && recipe.created_at > latestDate) {
        latestDate = recipe.created_at;
        const previewSteps = recipe.steps
          .sort((a, b) => a.index - b.index)
          .slice(0, 4)
          .map(s => ({ title: s.title, spec: s.spec }));
        latest = {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          tags: recipe.tags,
          version: recipe.version,
          step_count: recipe.steps.length,
          steps_preview: previewSteps,
          created_at: recipe.created_at,
          receipt_summary: recipe.receipt_summary || null,
        };
      }
    }

    this.sendJSON(res, 200, { recipe: latest });
  }

  private async serveStatic(_req: IncomingMessage, res: ServerResponse, url: URL) {
    const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const resolvedPublic = resolve(PUBLIC_DIR);
    const fullPath = resolve(PUBLIC_DIR, normalize('.' + requestedPath));

    if (!fullPath.startsWith(resolvedPublic)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    try {
      const data = await readFile(fullPath);
      const ext = extname(fullPath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
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
      const recipe = await this.store.getRecipe(recipeId);
      if (!recipe) {
        this.sendJSON(res, 404, { error: 'Recipe not found' });
        return;
      }
      this.sendJSON(res, 200, recipe);
    } else if (parts.length === 4 && parts[3] === 'steps') {
      const steps = await this.store.getSteps(recipeId);
      this.sendJSON(res, 200, steps);
    } else if (parts.length === 5 && parts[3] === 'steps') {
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
