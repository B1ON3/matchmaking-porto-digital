import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { create, list, remove, show, update } from '../controllers/startups.controller';
import { startupInsights } from '../controllers/insights.controller';
import { createProject, listProjects, removeProject, updateProject } from '../controllers/projects.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const startupRoutes = Router();

startupRoutes.post('/', create);
startupRoutes.get('/', list);
startupRoutes.get(
  '/:id/insights',
  authenticate,
  authorize(UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR),
  startupInsights,
);
startupRoutes.get('/:id', show);

// a partir daqui tudo exige token valido
startupRoutes.use(authenticate);
startupRoutes.get('/:id/projects', listProjects);
startupRoutes.post('/:id/projects', authorize(UserRole.STARTUP), createProject);
startupRoutes.put('/:id/projects/:projectId', authorize(UserRole.STARTUP), updateProject);
startupRoutes.delete('/:id/projects/:projectId', authorize(UserRole.STARTUP), removeProject);
startupRoutes.put('/:id', authorize(UserRole.STARTUP), update);
startupRoutes.delete('/:id', authorize(UserRole.STARTUP), remove);
