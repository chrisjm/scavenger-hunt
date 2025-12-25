// ABOUTME: CLI utility to move a user and their submissions between scavenger hunt groups.
// ABOUTME: Ensures memberships and submissions are reassigned while warning about task mismatches.

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { and, eq, sql } from 'drizzle-orm';
import {
	userProfiles,
	groups,
	userGroups,
	submissions,
	taskGroups
} from '../src/lib/server/db/schema';

function normalizeDatabaseUrl(url: string | undefined): string {
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

async function main() {
	const args = process.argv.slice(2);
	let dryRun = false;
	const filteredArgs = [];

	for (const arg of args) {
		if (arg === '--dry-run') {
			dryRun = true;
		} else {
			filteredArgs.push(arg);
		}
	}

	const [rawUsername, rawFromGroup, rawToGroup] = filteredArgs;
	if (!rawUsername || !rawFromGroup || !rawToGroup) {
		console.error(
			'Usage: tsx scripts/move-user-group.ts <displayName> <fromGroupName> <toGroupName> [--dry-run]'
		);
		process.exit(1);
	}

	const username = rawUsername.trim();
	const fromGroupName = rawFromGroup.trim();
	const toGroupName = rawToGroup.trim();

	const dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || 'local.db');
	const client = createClient({
		url: dbUrl,
		authToken: process.env.DATABASE_AUTH_TOKEN
	});
	const db = drizzle(client);

	try {
		const [profile] = await db
			.select()
			.from(userProfiles)
			.where(sql`lower(${userProfiles.displayName}) = ${username.toLowerCase()}`)
			.limit(1);

		if (!profile) {
			throw new Error(`User "${username}" not found by displayName.`);
		}

		const [fromGroup] = await db
			.select()
			.from(groups)
			.where(sql`lower(${groups.name}) = ${fromGroupName.toLowerCase()}`)
			.limit(1);
		if (!fromGroup) {
			throw new Error(`Source group "${fromGroupName}" not found.`);
		}

		const [toGroup] = await db
			.select()
			.from(groups)
			.where(sql`lower(${groups.name}) = ${toGroupName.toLowerCase()}`)
			.limit(1);
		if (!toGroup) {
			throw new Error(`Target group "${toGroupName}" not found.`);
		}

		if (fromGroup.id === toGroup.id) {
			throw new Error('Source and target group must be different.');
		}

		const sourceSubTasks = await db
			.select({ taskId: submissions.taskId })
			.from(submissions)
			.where(and(eq(submissions.userId, profile.id), eq(submissions.groupId, fromGroup.id)));
		const submissionTaskIds = [...new Set(sourceSubTasks.map((row) => row.taskId))];

		const targetTaskRows = await db
			.select({ taskId: taskGroups.taskId })
			.from(taskGroups)
			.where(eq(taskGroups.groupId, toGroup.id));
		const allowedTaskIds = new Set(targetTaskRows.map((row) => row.taskId));
		const incompatibleTaskIds = submissionTaskIds.filter((taskId) => !allowedTaskIds.has(taskId));

		const submissionsToMove = sourceSubTasks.length;
		const targetMembership = await db
			.select()
			.from(userGroups)
			.where(and(eq(userGroups.userId, profile.id), eq(userGroups.groupId, toGroup.id)))
			.get();
		const targetMembershipMessage = targetMembership
			? 'User is already a member of the target group.'
			: 'User will be added to the target group.';

		const runMove = async () => {
			await db.transaction(async (tx) => {
				const membership = await tx
					.select()
					.from(userGroups)
					.where(and(eq(userGroups.userId, profile.id), eq(userGroups.groupId, fromGroup.id)))
					.get();

				if (!membership) {
					throw new Error(`User "${username}" is not currently in group "${fromGroupName}".`);
				}

				await tx
					.delete(userGroups)
					.where(and(eq(userGroups.userId, profile.id), eq(userGroups.groupId, fromGroup.id)));

				const existingTargetMembership = await tx
					.select()
					.from(userGroups)
					.where(and(eq(userGroups.userId, profile.id), eq(userGroups.groupId, toGroup.id)))
					.get();

				if (!existingTargetMembership) {
					await tx.insert(userGroups).values({
						userId: profile.id,
						groupId: toGroup.id
					});
				}

				const updated = await tx
					.update(submissions)
					.set({ groupId: toGroup.id })
					.where(and(eq(submissions.userId, profile.id), eq(submissions.groupId, fromGroup.id)));

				console.log(`Moved user "${username}" from "${fromGroupName}" to "${toGroupName}".`);
				console.log(`Updated ${updated.rowsAffected ?? 0} submissions to new group.`);
			});
		};

		if (dryRun) {
			console.log('--- Dry Run ---');
			console.log(`User: ${username} (${profile.id})`);
			console.log(`From group: ${fromGroupName} (${fromGroup.id})`);
			console.log(`To group: ${toGroupName} (${toGroup.id})`);
			console.log(`Submissions to move: ${submissionsToMove}`);
			console.log(targetMembershipMessage);
			console.log(
				incompatibleTaskIds.length
					? `⚠️ ${incompatibleTaskIds.length} submission task(s) missing in target group.`
					: 'All submission tasks present in target group.'
			);
			console.log('No changes have been applied.');
		} else {
			await runMove();
		}

		if (incompatibleTaskIds.length > 0) {
			console.warn(
				`⚠️  Warning: ${incompatibleTaskIds.length} submission task(s) are not assigned to "${toGroupName}".` +
					' Consider adding those tasks to the target group if they should remain valid.'
			);
		} else {
			console.log('All submission tasks are available in the target group.');
		}
	} catch (error) {
		console.error('❌ Failed to move user between groups:', error);
		process.exitCode = 1;
	} finally {
		client.close();
	}
}

main().catch((error) => {
	console.error('❌ Unexpected error while moving user:', error);
	process.exitCode = 1;
});
