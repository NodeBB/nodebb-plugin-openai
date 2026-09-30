'use strict';

const groups = nodebb.require('./src/groups');

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res/* , next */) {
	const groupsData = await groups.getNonPrivilegeGroups('groups:createtime', 0, -1);
	groupsData.sort((a, b) => b.system - a.system);
	// Uncomment the following lines to list available models
	// const list = await openai.models.list();
	// for await (const model of list) {
	// console.log(model.id);
	// }

	res.render('admin/plugins/openai', {
		title: 'OpenAI',
		groups: groupsData,
		models: [
			{ id: 'gpt-3.5-turbo' },
			{ id: 'gpt-4' },
			{ id: 'gpt-4-turbo' },
			{ id: 'gpt-4.1' },
			{ id: 'gpt-4.1-mini' },
			{ id: 'gpt-4.1-nano' },
			{ id: 'gpt-4o' },
			{ id: 'gpt-4o-mini' },
			{ id: 'gpt-5-codex' },
			{ id: 'gpt-5-mini' },
			{ id: 'gpt-5-nano' },
			{ id: 'gpt-5-pro' },
			{ id: 'gpt-5.1' },
			{ id: 'gpt-5.1-codex' },
			{ id: 'gpt-5.1-codex-max' },
			{ id: 'gpt-5.1-codex-mini' },
			{ id: 'gpt-5.2' },
			{ id: 'gpt-5.2-codex' },
			{ id: 'gpt-5.2-pro' },
			{ id: 'gpt-5.3-codex' },
			{ id: 'gpt-5.4' },
			{ id: 'gpt-5.4-mini' },
			{ id: 'gpt-5.4-nano' },
			{ id: 'gpt-5.4-pro' },
			{ id: 'gpt-5.5' },
			{ id: 'gpt-5.5-pro' },
			{ id: 'gpt-5.6-luna' },
			{ id: 'gpt-5.6-sol' },
			{ id: 'gpt-5.6-terra' },
			{ id: 'gpt-5.6' },
			{ id: 'gpt-6-astra' },
			{ id: 'gpt-6-luna' },
			{ id: 'gpt-6-sol' },
			{ id: 'gpt-6.1-sol' },
			{ id: 'gemini-2.0-flash' },
		],
	});
};
