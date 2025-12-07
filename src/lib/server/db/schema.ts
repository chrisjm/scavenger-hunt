import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
});

export const tasks = sqliteTable('tasks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	description: text('description').notNull(), // "Find a Santa Hat"
	aiPrompt: text('ai_prompt').notNull(), // "A photo of a red and white Santa hat"
	minConfidence: real('min_confidence').notNull().default(0.7), // 0.7 for loose, 0.9 for strict
	unlockDate: integer('unlock_date', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
});

export const submissions = sqliteTable('submissions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	taskId: integer('task_id')
		.notNull()
		.references(() => tasks.id),
	imagePath: text('image_path').notNull(),
	aiMatch: integer('ai_match', { mode: 'boolean' }),
	aiConfidence: real('ai_confidence'),
	aiReasoning: text('ai_reasoning'),
	valid: integer('valid', { mode: 'boolean' }).default(false),
	submittedAt: integer('submitted_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
});
