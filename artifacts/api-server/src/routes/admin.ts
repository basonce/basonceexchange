import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SUPABASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADMIN_UUIDS = new Set([
  '88292f59-898a-4fef-a1c8-8813d7b60b61',
]);

router.get('/admin/users', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?select=id,email,full_name,is_admin,is_active,is_real_user,is_deleted,created_at,verification_status,user_level&order=created_at.desc&limit=500`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(500).json({ error: err });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
