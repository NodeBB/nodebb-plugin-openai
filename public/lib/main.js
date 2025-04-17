'use strict';

$('document').ready(function () {

	function alertType(type, message) {
		require(['alerts'], function (alerts) {
			alerts[type](message);
		});
	}

	$(window).on('action:topic.tools.load', function () {
		$('.openai-summarize-topic').on('click', summarizeTopic);
	});

	function summarizeTopic() {
		const tid = ajaxify.data.tid;
		require(['bootbox'], function (bootbox) {
			const modal = bootbox.dialog({
				title: '[[openai:topic-summary]]',
				message: `<div class="openai-summarize-topic"><div class="loading text-center"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div></div>`,
				size: 'large',
				buttons: {
					ok: {
						label: 'OK',
						className: 'btn-primary',
					},
				},
			});
			socket.emit('plugins.openai.summarizeTopic', { tid }, function (err, data) {
				if (err) {
					return alertType('error', err.message);
				}
				if (data) {
					modal.find('.openai-summarize-topic').text(data);
				} else {
					modal.modal('hide');
				}
			});
		});
	}
});
