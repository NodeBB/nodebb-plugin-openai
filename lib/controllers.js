'use strict';

const groups = require.main.require('./src/groups');

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res/* , next */) {
	const groupsData = await groups.getNonPrivilegeGroups('groups:createtime', 0, -1);
	groupsData.sort((a, b) => b.system - a.system);
	res.render('admin/plugins/openai', {
		title: 'OpenAI',
		groups: groupsData,
	});
};
