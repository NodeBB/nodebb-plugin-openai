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

const plugin = module.exports;

const defaults = {
	apikey: '',
	'chatgpt-username': '',
	enablePrivateMessages: 'off',
	model: 'gpt-3.5-turbo',
	minimumReputation: 0,
	allowedGroups: '[]',
};


plugin.init = async (params) => {
	const { router /* , middleware , controllers */ } = params;
	const settings = await meta.settings.get('openai')
	if (settings && settings.apikey) {
		openai = new OpenAI({
			apiKey: settings.apikey,
		});
	}

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/openai', controllers.renderAdminPage);
};

async function getSettings() {
	const settings = await meta.settings.get('openai')
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
				(msg) => ({ role: msg.fromuid === chatgptUid ? 'assistant' : 'user', content: msg.content })
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

async function canUseOpenAI(uid, settings) {
	if (!await checkReputation(uid, settings)) {
		return false;
	}
	if (!await checkGroupMembership(uid, settings)) {
		return false;
	}
	return true;
}

async function checkReputation(uid, settings) {
	const reputation = await user.getUserField(uid, 'reputation');
	const hasEnoughRep = parseInt(settings.minimumReputation, 10) === 0 || parseInt(reputation, 10) >= parseInt(settings.minimumReputation, 10);

	if (!hasEnoughRep) {
		sockets.server.in(`uid_${uid}`).emit('event:alert', {
			type: 'danger',
			title: '[[global:alert.error]]',
			message: `[[openai:error.need-x-reputation-to-mention, ${settings.minimumReputation}]]`,
		});
	}
	return hasEnoughRep;
}

async function checkGroupMembership(uid, settings) {
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
	if (!memberOfAny) {
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

async function chatComplete(message) {
	if (!openai) {
		throw new Error('API not created!');
	}
	const isConversation = Array.isArray(message);
	const { model } = await meta.settings.get('openai');
	const chatCompletion = await openai.chat.completions.create({
		model: model || 'gpt-3.5-turbo',
		messages: isConversation ? message : [{ role: 'user', content: message }],
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

