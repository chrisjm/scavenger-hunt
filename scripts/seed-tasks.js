import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { tasks } from '../src/lib/server/db/schema.ts';

// Create database connection
const client = new Database('local.db');
const db = drizzle(client);

const sampleTasks = [
	{
		description: 'Find a Santa Hat',
		aiPrompt: 'A red and white Santa hat, clearly visible in the image',
		minConfidence: 0.7,
		unlockDate: new Date('2024-12-01')
	},
	{
		description: 'Find a Christmas Tree',
		aiPrompt: 'A Christmas tree, either real or artificial, decorated or undecorated',
		minConfidence: 0.75,
		unlockDate: new Date('2024-12-02')
	},
	{
		description: 'Find Christmas Lights',
		aiPrompt: 'Christmas lights or holiday lights, either on a tree, house, or decorative display',
		minConfidence: 0.6,
		unlockDate: new Date('2024-12-03')
	},
	{
		description: 'Find a Candy Cane',
		aiPrompt: 'A candy cane with red and white stripes in the traditional hook shape',
		minConfidence: 0.8,
		unlockDate: new Date('2024-12-04')
	},
	{
		description: 'Find a Snowman',
		aiPrompt: 'A snowman made of snow, or a snowman decoration/figurine',
		minConfidence: 0.75,
		unlockDate: new Date('2024-12-05')
	},
	{
		description: 'Find a Reindeer',
		aiPrompt: 'A reindeer, either real, toy, decoration, or image of a reindeer',
		minConfidence: 0.8,
		unlockDate: new Date('2024-12-06')
	},
	{
		description: 'Find Christmas Cookies',
		aiPrompt: 'Christmas-themed cookies, gingerbread cookies, or holiday baked goods',
		minConfidence: 0.7,
		unlockDate: new Date('2024-12-07')
	},
	{
		description: 'Find a Christmas Stocking',
		aiPrompt: 'A Christmas stocking hung up or displayed for the holidays',
		minConfidence: 0.75,
		unlockDate: new Date('2024-12-08')
	}
];

async function seedTasks() {
	try {
		console.log('🌱 Seeding tasks...');

		// Insert sample tasks
		for (const task of sampleTasks) {
			await db.insert(tasks).values(task);
			console.log(`✅ Added task: ${task.description}`);
		}

		console.log('🎉 Database seeded successfully!');
	} catch (error) {
		console.error('❌ Error seeding database:', error);
	} finally {
		client.close();
	}
}

seedTasks();
