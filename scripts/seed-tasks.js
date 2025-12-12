import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { tasks, userProfiles, authUsers, groups, userGroups } from '../src/lib/server/db/schema.ts';

// Create database connection using the same DATABASE_URL as the app
function normalizeDatabaseUrl(url) {
	const trimmed = String(url ?? '').trim();
	if (
		trimmed.startsWith('libsql://') ||
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('file:')
	) {
		return trimmed;
	}

	return `file:${trimmed || 'local.db'}`;
}

const dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || 'local.db');
const client = createClient({
	url: dbUrl,
	authToken: process.env.DATABASE_AUTH_TOKEN
});
const db = drizzle(client);

const sampleTasks = [
	{
		description: 'Find a Santa Hat',
		aiPrompt: 'A red and white Santa hat, clearly visible in the image',
		minConfidence: 0.7,
		unlockDate: new Date('2025-12-01')
	},
	{
		description: 'Find a Christmas Tree',
		aiPrompt: 'A Christmas tree, either real or artificial, decorated or undecorated',
		minConfidence: 0.75,
		unlockDate: new Date('2025-12-02')
	},
	{
		description: 'Find Christmas Lights',
		aiPrompt: 'Christmas lights or holiday lights, either on a tree, house, or decorative display',
		minConfidence: 0.6,
		unlockDate: new Date('2025-12-03')
	},
	{
		description: 'Find a Candy Cane',
		aiPrompt: 'A candy cane with red and white stripes in the traditional hook shape',
		minConfidence: 0.8,
		unlockDate: new Date('2025-12-04')
	},
	{
		description: 'Find a Snowman',
		aiPrompt: 'A snowman made of snow, or a snowman decoration/figurine',
		minConfidence: 0.75,
		unlockDate: new Date('2025-12-05')
	},
	{
		description: 'Find a Reindeer',
		aiPrompt: 'A reindeer, either real, toy, decoration, or image of a reindeer',
		minConfidence: 0.8,
		unlockDate: new Date('2025-12-06')
	},
	{
		description: 'Find Christmas Cookies',
		aiPrompt: 'Christmas-themed cookies, gingerbread cookies, or holiday baked goods',
		minConfidence: 0.7,
		unlockDate: new Date('2025-12-07')
	},
	{
		description: 'Find a Christmas Stocking',
		aiPrompt: 'A Christmas stocking hung up or displayed for the holidays',
		minConfidence: 0.75,
		unlockDate: new Date('2025-12-08')
	}
];

async function seedTasksAndAdmin() {
	try {
		console.log('🌱 Seeding tasks...');

		// Insert sample tasks
		for (const task of sampleTasks) {
			await db.insert(tasks).values(task);
			console.log(`✅ Added task: ${task.description}`);
		}

		console.log('🌱 Seeding admin user and test group...');

		const ADMIN_USERNAME = 'chrisjm';
		const ADMIN_PASSWORD = 'cooperdooper';
		const TEST_GROUP_NAME = 'test';
		const usernameLower = ADMIN_USERNAME.toLowerCase();

		// Check if admin profile already exists
		const existingProfiles = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.displayName, ADMIN_USERNAME));

		if (existingProfiles.length === 0) {
			const profileId = crypto.randomUUID();
			const authUserId = crypto.randomUUID();
			const groupId = crypto.randomUUID();

			const passwordHash = await hash(ADMIN_PASSWORD);

			// Create profile row with isAdmin true
			await db
				.insert(userProfiles)
				.values({ id: profileId, displayName: ADMIN_USERNAME, isAdmin: true });

			// Create auth row
			await db.insert(authUsers).values({
				id: authUserId,
				username: usernameLower,
				passwordHash,
				profileId
			});

			// Create test group
			await db.insert(groups).values({
				id: groupId,
				name: TEST_GROUP_NAME,
				description: 'Seeded test group',
				createdByUserId: profileId
			});

			// Add membership for admin in test group
			await db.insert(userGroups).values({
				id: crypto.randomUUID(),
				userId: profileId,
				groupId
			});

			console.log('✅ Seeded admin user "chrisjm" and group "test"');
		} else {
			console.log('ℹ️ Admin user already exists, skipping admin/group seed');
		}

		console.log('🎉 Database seeded successfully!');
	} catch (error) {
		console.error('❌ Error seeding database:', error);
	} finally {
		client.close();
	}
}

seedTasksAndAdmin();
