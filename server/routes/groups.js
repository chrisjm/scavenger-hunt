import express from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
const { groups, userGroups, users } = schema;

// Helper: is admin
async function ensureAdmin(userId) {
	const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!rows.length) return { ok: false, status: 404, body: { error: 'User not found' } };
	if (!rows[0].isAdmin)
		return { ok: false, status: 403, body: { error: 'Admin privileges required' } };
	return { ok: true, user: rows[0] };
}

// GET /api/groups - list groups
router.get('/', async (_req, res) => {
	try {
		const result = await db.select().from(groups);
		res.json(result);
	} catch (error) {
		console.error('Error listing groups:', error);
		res.status(500).json({ error: 'Failed to list groups' });
	}
});

// POST /api/groups (admin only)
router.post('/', async (req, res) => {
	try {
		const { name, description } = req.body;
		const userId = req.user?.userId;
		if (!userId || !name) {
			return res.status(400).json({ error: 'userId and name are required' });
		}

		const adminCheck = await ensureAdmin(userId);
		if (!adminCheck.ok) return res.status(adminCheck.status).json(adminCheck.body);

		const trimmedName = String(name).trim();
		if (trimmedName.length < 2 || trimmedName.length > 64) {
			return res.status(400).json({ error: 'Name must be between 2 and 64 characters' });
		}

		// Case-insensitive uniqueness check
		const existing = await db
			.select()
			.from(groups)
			.where(sql`lower(${groups.name}) = lower(${trimmedName})`)
			.limit(1);
		if (existing.length) {
			return res.status(409).json({ error: 'Group name already exists (case-insensitive)' });
		}

		const groupId = crypto.randomUUID();
		const [created] = await db
			.insert(groups)
			.values({
				id: groupId,
				name: trimmedName,
				description: description?.trim?.() || null,
				createdByUserId: userId
			})
			.returning();

		// Auto-add creator to the group
		await db.insert(userGroups).values({
			id: crypto.randomUUID(),
			userId,
			groupId
		});

		res.json({ group: created });
	} catch (error) {
		console.error('Error creating group:', error);
		res.status(500).json({ error: 'Failed to create group' });
	}
});

// POST /api/groups/:groupId/join
router.post('/:groupId/join', async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = req.user?.userId;
		if (!userId || !groupId) {
			return res.status(400).json({ error: 'userId and groupId are required' });
		}

		// Validate group
		const group = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
		if (!group.length) {
			return res.status(404).json({ error: 'Group not found' });
		}

		// Validate user
		const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		if (!user.length) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Prevent duplicates
		const existing = await db
			.select()
			.from(userGroups)
			.where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
			.limit(1);
		if (existing.length) {
			return res.status(409).json({ error: 'Already a member of this group' });
		}

		await db.insert(userGroups).values({
			id: crypto.randomUUID(),
			userId,
			groupId
		});

		res.json({ success: true });
	} catch (error) {
		console.error('Error joining group:', error);
		res.status(500).json({ error: 'Failed to join group' });
	}
});

// DELETE /api/groups/:groupId/members/:userId - leave group
router.delete('/:groupId/members/:userId', async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = req.user?.userId;
		const membership = await db
			.select()
			.from(userGroups)
			.where(and(eq(userGroups.groupId, groupId), eq(userGroups.userId, userId)))
			.limit(1);
		if (!membership.length) {
			return res.status(404).json({ error: 'Membership not found' });
		}

		await db
			.delete(userGroups)
			.where(and(eq(userGroups.groupId, groupId), eq(userGroups.userId, userId)));
		res.json({ success: true });
	} catch (error) {
		console.error('Error leaving group:', error);
		res.status(500).json({ error: 'Failed to leave group' });
	}
});

// GET /api/users/:userId/groups - list groups for a user
router.get('/users/:userId/groups', async (req, res) => {
	try {
		const userId = req.user?.userId;
		const rows = await db
			.select({
				id: groups.id,
				name: groups.name,
				description: groups.description
			})
			.from(userGroups)
			.innerJoin(groups, eq(userGroups.groupId, groups.id))
			.where(eq(userGroups.userId, userId));

		res.json(rows);
	} catch (error) {
		console.error('Error fetching user groups:', error);
		res.status(500).json({ error: 'Failed to fetch user groups' });
	}
});

export default router;
