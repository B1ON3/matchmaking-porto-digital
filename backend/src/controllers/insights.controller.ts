import { Request, Response } from 'express';
import { z } from 'zod';
import { getAdminOverview, getInvestorInsights, getStartupInsights } from '../services/insights.service';

const idSchema = z.object({ id: z.string().uuid() });

export async function startupInsights(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  res.json(await getStartupInsights(id, req.user!));
}

export async function investorInsights(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  res.json(await getInvestorInsights(id, req.user!));
}

export async function adminOverview(_req: Request, res: Response) {
  res.json(await getAdminOverview());
}
