import { Router } from 'express';
import { connectSlack, disconnectSlack, slackCallback, slackStatus } from '../controllers/slack.controller.js';
import { requireAuth } from '../utils/auth.js';

const router = Router();
router.get('/connect', requireAuth, connectSlack);
router.get('/callback', slackCallback);
router.get('/status', requireAuth, slackStatus);
router.post('/disconnect', requireAuth, disconnectSlack);
export default router;
