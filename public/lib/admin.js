'use strict';

import { save, load } from 'settings';

export function init() {
	handleSettingsForm();
};

function handleSettingsForm() {
	load('openai', $('.openai-settings'), function () {

	});

	$('#save').on('click', () => {
		save('openai', $('.openai-settings'));
	});
}
