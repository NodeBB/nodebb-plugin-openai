'use strict';

const db = require.main.require('./src/database');
const batch = require.main.require('./src/batch');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const user = require.main.require('./src/user');

function formatPosts(posts) {
	return posts
		.map((post) => `User ${post.username}:\n${post.content}`)
		.join('\n---\n');
}

function chunkPosts(posts, maxTokensPerChunk = 3000) {
	const chunks = [];
	let currentChunk = [];
	let currentTokens = 0;

	// eslint-disable-next-line no-restricted-syntax
	for (const post of posts) {
		const estimatedTokens = Math.ceil(post.content.length / 4) + 10;
		if (currentTokens + estimatedTokens > maxTokensPerChunk) {
			chunks.push(currentChunk);
			currentChunk = [];
			currentTokens = 0;
		}
		currentChunk.push(post);
		currentTokens += estimatedTokens;
	}

	if (currentChunk.length > 0) {
		chunks.push(currentChunk);
	}

	return chunks;
}

async function summarizeChunk(chunk, openai, settings) {
	const threadText = formatPosts(chunk);
	if (!threadText) {
		return '';
	}
	const response = await openai.chat.completions.create({
		model: settings.model || 'gpt-3.5-turbo',
		messages: [
			{
				role: 'system',
				content: 'You summarize discussion forum threads into concise summaries.',
			},
			{
				role: 'user',
				content: `Summarize the following discussion thread:\n\n${threadText}`,
			},
		],
		temperature: 0.5,
	});

	return response.choices[0].message.content.trim();
}

exports.summarizeTopic = async function(tid, openai, settings) {
	const allPids = await topics.getPids(tid);

	const userMap = {};

	const chunkSummaries = [];

	await batch.processArray(allPids, async function (pids) {
		let postData = await posts.getPostsFields(pids, ['uid', 'content', 'deleted']);
		postData = postData.filter((p) => !p.deleted);
		const missingUids = [];
		postData.forEach((p) => {
			if (!userMap.hasOwnProperty(p.uid)) {
				missingUids.push(p.uid)
			}
		});
		const userData = await user.getUsersFields(missingUids, ['username']);
		userData.forEach((u) => {
			userMap[u.uid] = u.displayname;
		});
		postData.forEach((p) => {
			p.username = userMap[p.uid];
		});

		const chunks = chunkPosts(postData);

		chunkSummaries.push(...await Promise.all(chunks.map(async (chunk) => {
			return summarizeChunk(chunk, openai, settings)
		})));
	}, {
		batch: 500,
	});

	if (chunkSummaries.length === 1) {
		return chunkSummaries[0];
	}
	// Final summary from all summaries
	const finalInput = chunkSummaries.join("\n\n");
	if (!finalInput) {
		return '';
	}
	const finalResponse = await openai.chat.completions.create({
		model: settings.model || 'gpt-3.5-turbo',
		messages: [
			{
				role: 'system',
				content: 'You are an assistant that summarizes forum thread summaries into a single cohesive summary.',
			},
			{
				role: 'user',
				content: `Here are summaries of parts of a forum discussion:\n\n${finalInput}\n\nPlease write a final, concise summary of the full discussion.`,
			},
		],
		temperature: 0.5,
	});

	return finalResponse.choices[0].message.content.trim();
};

exports.clearTopicSummary = async function(tids) {
	await db.deleteObjectFields(tids.map((tid) => `topic:${tid}`), ['openai:summary']);
};