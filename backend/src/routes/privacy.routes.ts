import { Router } from 'express';
import { deleteAccount, exportData, overview, policy, recordConsent } from '../controllers/privacy.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const privacyRoutes = Router();

privacyRoutes.get('/policy', policy);

export const mePrivacyRoutes = Router();

mePrivacyRoutes.use(authenticate);
mePrivacyRoutes.get('/', overview);
mePrivacyRoutes.post('/consents', recordConsent);
mePrivacyRoutes.get('/export', exportData);
mePrivacyRoutes.delete('/account', deleteAccount);
