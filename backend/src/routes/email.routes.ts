import { Router } from 'express';
import multer from 'multer';
import { cancelEmail, listEmails, scheduleEmails, search } from '../controllers/email.controller.js';
import { requireAuth } from '../utils/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const router = Router();
router.use(requireAuth);
router.post('/schedule', scheduleEmails);
router.get('/', listEmails);
router.get('/search', search);
router.post('/:id/cancel', cancelEmail);
router.post('/parse-leads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const text = req.file.buffer.toString('utf8');
  const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].map((e) => e.toLowerCase());
  res.json({ count: emails.length, emails });
});
export default router;
