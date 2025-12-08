import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
});

export const usersRelations = relations(users, ({ many }) => ({
	photos: many(photos),
	submissions: many(submissions)
}));

export const photos = sqliteTable('photos', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	filePath: text('file_path').notNull(),
	originalFilename: text('original_filename').notNull(),
	fileSize: integer('file_size').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
});

export const photosRelations = relations(photos, ({ one, many }) => ({
	user: one(users, {
		fields: [photos.userId],
		references: [users.id]
	}),
	submissions: many(submissions)
}));

export const tasks = sqliteTable('tasks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	description: text('description').notNull(),
	aiPrompt: text('ai_prompt').notNull(),
	minConfidence: real('min_confidence').notNull().default(0.7),
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
	photoId: text('photo_id')
		.notNull()
		.references(() => photos.id, { onDelete: 'cascade' }),

	aiMatch: integer('ai_match', { mode: 'boolean' }),
	aiConfidence: real('ai_confidence'),
	aiReasoning: text('ai_reasoning'),
	valid: integer('valid', { mode: 'boolean' }).default(false),
	submittedAt: integer('submitted_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
	photo: one(photos, {
		fields: [submissions.photoId],
		references: [photos.id]
	}),
	task: one(tasks, {
		fields: [submissions.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [submissions.userId],
		references: [users.id]
	})
}));
