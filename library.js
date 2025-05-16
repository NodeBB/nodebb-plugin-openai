'use strict';

const { OpenAI } = require('openai');

let openai;

const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');
const socketHelpers = require.main.require('./src/socket.io/helpers');
const topics = require.main.require('./src/topics');
const user = require.main.require('./src/user');
const messaging = require.main.require('./src/messaging');
const api = require.main.require('./src/api');
const privileges = require.main.require('./src/privileges');
const groups = require.main.require('./src/groups');
const sockets = require.main.require('./src/socket.io');
const socketPlugins = require.main.require('./src/socket.io/plugins');
const summary = require('./lib/summary');

const plugin = module.exports;

const defaults = {
	apikey: '',
	'chatgpt-username': '',
	enablePrivateMessages: 'off',
	model: 'gpt-3.5-turbo',
	minimumReputation: 0,
	allowedGroups: '[]',
	systemPrompt: 'You are a helpful assistant',
};


plugin.init = async (params) => {
	const { router /* , middleware , controllers */ } = params;
	const settings = await meta.settings.get('openai');
	if (settings && settings.apikey) {
		openai = new OpenAI({
			apiKey: settings.apikey,
		});
		plugin.openai = openai;
	}

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/openai', controllers.renderAdminPage);
};

async function getSettings() {
	const settings = await meta.settings.get('openai');
	return {...defaults, ...settings };
}

plugin.actionMentionsNotify = async function (hookData) {
	try {
		const { notification } = hookData;
		if (!notification) {
			return;
		}

		const settings = await getSettings();
		if (!await canUseOpenAI(notification.from, settings)) {
			return;
		}

		const chatgptusername = settings['chatgpt-username'];
		const chatgptUid = await user.getUidByUsername(chatgptusername);
		if (!chatgptUid) {
			return;
		}
		if (notification.tid && notification.bodyLong.startsWith(`@${chatgptusername}`)) {
			const canReply = await privileges.topics.can('topics:reply', notification.tid, chatgptUid);
			if (!canReply) {
				return;
			}
			const message = notification.bodyLong.replace(new RegExp(`^@${chatgptusername}`), '');
			if (message.length) {
				const response = await chatComplete(message);

				if (response) {
					const postData = await topics.reply({
						uid: chatgptUid,
						content: response,
						tid: notification.tid,
						toPid: notification.pid,
					});

					await user.updateOnlineUsers(chatgptUid);
					await socketHelpers.notifyNew(chatgptUid, 'newPost', {
						posts: [postData],
						'reputation:disabled': meta.config['reputation:disabled'] === 1,
						'downvote:disabled': meta.config['downvote:disabled'] === 1,
					});
				}
			}
		}
	} catch (err) {
		console.error(err.stack);
	}
};

plugin.actionMessagingSave = async function (hookData) {
	try {
		const { message } = hookData;
		if (message.system) {
			return;
		}
		const settings = await getSettings();
		if (!await canUseOpenAI(message.fromuid, settings)) {
			return;
		}

		const chatgptusername = settings['chatgpt-username'];
		const chatgptUid = await user.getUidByUsername(chatgptusername);
		const { roomId, content, fromuid } = message;
		// don't reply to self
		if (parseInt(fromuid, 10) === parseInt(chatgptUid, 10)) {
			return;
		}

		const [roomData, inRoom] = await Promise.all([
			messaging.getRoomData(roomId),
			messaging.isUserInRoom(chatgptUid, roomId),
		]);

		if (!roomData || !inRoom) {
			return;
		}
		const isPrivate = !roomData.public && !roomData.groupChat;
		if (isPrivate && settings.enablePrivateMessages === 'off') {
			return;
		}
		const shouldReply = isPrivate || content.startsWith(`@${chatgptusername}`);

		// only reply in 1v1 chats or in public group chats when @<chat-gpt-username> is used
		if (!shouldReply) {
			return;
		}
		let conversation = [{ role: 'user', content: message.content }];
		if (isPrivate) {
			const mids = await getMessageIds(roomId, chatgptUid, 0, 20);

			// dont allow chats to get too long
			if (mids.length > 20) {
				await api.chats.post({ uid: chatgptUid, session: {} }, {
					roomId,
					message: 'Conversation too long, please start a new chat',
					toMid: message.mid,
				});
				return;
			}
			let messages = await messaging.getMessagesFields(mids, ['fromuid', 'content', 'system']);
			messages = messages.filter(m => m && !m.system);
			conversation = messages.map(
				msg => ({ role: msg.fromuid === chatgptUid ? 'assistant' : 'user', content: msg.content })
			);
		}

		const response = await chatComplete(conversation);

		if (response) {
			await api.chats.post({ uid: chatgptUid, session: {} }, {
				roomId,
				message: response,
				toMid: isPrivate ? undefined : message.mid,
			});
		}
	} catch (err) {
		console.error(err.stack);
	}
};

async function canUseOpenAI(uid, settings, silent = false) {
	if (!await checkReputation(uid, settings, silent)) {
		return false;
	}
	if (!await checkGroupMembership(uid, settings, silent)) {
		return false;
	}
	return true;
}

async function checkReputation(uid, settings, silent) {
	const reputation = await user.getUserField(uid, 'reputation');
	const hasEnoughRep = parseInt(settings.minimumReputation, 10) === 0 ||
		parseInt(reputation, 10) >= parseInt(settings.minimumReputation, 10);

	if (!hasEnoughRep && !silent) {
		sockets.server.in(`uid_${uid}`).emit('event:alert', {
			type: 'danger',
			title: '[[global:alert.error]]',
			message: `[[openai:error.need-x-reputation-to-mention, ${settings.minimumReputation}]]`,
		});
	}
	return hasEnoughRep;
}

async function checkGroupMembership(uid, settings, silent) {
	let allowedGroups = [];
	try {
		allowedGroups = JSON.parse(settings.allowedGroups) || [];
	} catch (err) {
		console.error(err);
		allowedGroups = [];
	}

	if (!allowedGroups.length) {
		return true;
	}

	const isMembers = await groups.isMemberOfGroups(uid, allowedGroups);
	const memberOfAny = isMembers.includes(true);
	if (!memberOfAny && !silent) {
		sockets.server.in(`uid_${uid}`).emit('event:alert', {
			type: 'danger',
			title: '[[global:alert.error]]',
			message: `[[error:no-privileges]]`,
		});
	}
	return memberOfAny;
}

async function getMessageIds(roomId, uid, start, stop) {
	const isPublic = await db.getObjectField(`chat:room:${roomId}`, 'public');
	if (parseInt(isPublic, 10) === 1) {
		return await db.getSortedSetRange(
			`chat:room:${roomId}:mids`, start, stop
		);
	}
	const userjoinTimestamp = await db.sortedSetScore(`chat:room:${roomId}:uids`, uid);
	return await db.getSortedSetRangeByScore(
		`chat:room:${roomId}:mids`, start, stop === -1 ? -1 : stop - start + 1, userjoinTimestamp, '+inf'
	);
}

async function chatComplete(messages) {
	if (!openai) {
		throw new Error('API not created!');
	}
	const isConversation = Array.isArray(messages);
	const { model, systemPrompt } = await getSettings();
	const conversation = [];
	if (systemPrompt) {
		conversation.push({ role: 'system', content: systemPrompt });
	}
	if (isConversation) {
		conversation.push(...messages);
	} else {
		conversation.push({ role: 'user', content: messages });
	}

	const chatCompletion = await openai.chat.completions.create({
		model: model || 'gpt-3.5-turbo',
		messages: conversation,
	});

	return chatCompletion.choices[0]?.message?.content;
}

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/openai',
		icon: 'fa-robot',
		name: 'OpenAI',
	});

	return header;
};

plugin.filterTopicThreadTools = async (hookData) => {
	if (!await canUseOpenAI(hookData.uid, await getSettings(), true)) {
		return hookData;
	}
	hookData.tools.push({
		class: 'openai-summarize-topic',
		icon: 'fa-wand-magic-sparkles',
		title: '[[openai:summarize-topic]]',
	});
	return hookData;
};

plugin.actionTopicReply = async (hookData) => {
	await summary.clearTopicSummary([hookData.post.tid]);
};

plugin.actionPostEdit = async (hookData) => {
	await summary.clearTopicSummary([hookData.post.tid]);
};

plugin.actionPostsPurge = async (hookData) => {
	const { posts } = hookData;
	const uniqTids = [...new Set(posts.map(p => p.tid))];
	await summary.clearTopicSummary(uniqTids);
};

plugin.actionPostRestore = async (hookData) => {
	await summary.clearTopicSummary([hookData.post.tid]);
};

plugin.actionPostDelete = async (hookData) => {
	await summary.clearTopicSummary([hookData.post.tid]);
};

plugin.actionPostMove = async (hookData) => {
	await summary.clearTopicSummary([hookData.post.tid, hookData.tid]);
};

plugin.actionPostChangeOwner = async (hookData) => {
	const { posts } = hookData;
	const uniqTids = [...new Set(posts.map(p => p.tid))];
	await summary.clearTopicSummary(uniqTids);
};

socketPlugins.openai = {};

socketPlugins.openai.summarizeTopic = async function (socket, data) {
	const { tid } = data;
	if (!await privileges.topics.can('topics:read', tid, socket.uid)) {
		throw new Error('[[error:no-privileges]]');
	}
	const settings = await getSettings();
	if (!await canUseOpenAI(socket.uid, settings)) {
		return;
	}

	let openaiSummary = await topics.getTopicField(tid, 'openai:summary');
	if (openaiSummary) {
		return openaiSummary;
	}
	openaiSummary = await summary.summarizeTopic(tid, openai, settings);
	await topics.setTopicField(tid, 'openai:summary', openaiSummary);
	return openaiSummary;
};
