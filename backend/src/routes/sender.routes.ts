import { Router } from 'express';
import { createSender, deactivateSender, listSenders } from '../controllers/sender.controller.js';
import { requireAuth } from '../utils/auth.js';
const router = Router(); router.use(requireAuth);
router.get('/', listSenders); router.post('/', createSender); router.post('/:id/deactivate', deactivateSender);
export default router;
