import crypto from 'node:crypto';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const userProfiles = sqliteTable('user_profiles', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	displayName: text('display_name').notNull().unique(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
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
		.references(() => userProfiles.id, { onDelete: 'cascade' }),
	filePath: text('file_path').notNull(),
	originalFilename: text('original_filename').notNull(),
	fileSize: integer('file_size').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const photosRelations = relations(photos, ({ one, many }) => ({
	user: one(userProfiles, {
		fields: [photos.userId],
		references: [userProfiles.id]
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
		.references(() => userProfiles.id),
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
	user: one(userProfiles, {
		fields: [submissions.userId],
		references: [userProfiles.id]
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
	createdByUserId: text('created_by_user_id').references(() => userProfiles.id)
});

export const userGroups = sqliteTable('user_groups', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => userProfiles.id, { onDelete: 'cascade' }),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	joinedAt: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const taskGroups = sqliteTable('task_groups', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	taskId: integer('task_id')
		.notNull()
		.references(() => tasks.id, { onDelete: 'cascade' }),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const taskGroupsRelations = relations(taskGroups, ({ one }) => ({
	task: one(tasks, {
		fields: [taskGroups.taskId],
		references: [tasks.id]
	}),
	group: one(groups, {
		fields: [taskGroups.groupId],
		references: [groups.id]
	})
}));

export const groupsRelations = relations(groups, ({ many }) => ({
	members: many(userGroups),
	submissions: many(submissions),
	tasks: many(taskGroups)
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
	user: one(userProfiles, {
		fields: [userGroups.userId],
		references: [userProfiles.id]
	}),
	group: one(groups, {
		fields: [userGroups.groupId],
		references: [groups.id]
	})
}));

export const authUsers = sqliteTable('auth_users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	profileId: text('profile_id')
		.notNull()
		.references(() => userProfiles.id, { onDelete: 'cascade' })
});

export type AuthUser = typeof authUsers.$inferSelect;

export const sessions = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	secretHash: text('secret_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
