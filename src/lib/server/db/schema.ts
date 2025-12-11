import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const usersRelations = relations(users, ({ many }) => ({
	photos: many(photos),
	submissions: many(submissions),
	groups: many(userGroups)
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
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
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
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const submissions = sqliteTable('submissions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
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
	submittedAt: integer('submitted_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
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
	}),
	group: one(groups, {
		fields: [submissions.groupId],
		references: [groups.id]
	})
}));

export const groups = sqliteTable('groups', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	createdByUserId: text('created_by_user_id').references(() => users.id)
});

export const userGroups = sqliteTable('user_groups', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	joinedAt: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const groupsRelations = relations(groups, ({ many }) => ({
	members: many(userGroups),
	submissions: many(submissions)
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
	user: one(users, {
		fields: [userGroups.userId],
		references: [users.id]
	}),
	group: one(groups, {
		fields: [userGroups.groupId],
		references: [groups.id]
	})
}));

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	playerUserId: text('player_user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
});

export type User = typeof user.$inferSelect;
