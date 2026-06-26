<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form role="form" class="openai-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">[[openai:admin.general]]</h5>

					<div class="mb-3">
						<label class="form-label" for="apikey">[[openai:admin.apikey]]</label>
						<input type="text" id="apikey" name="apikey" title="[[openai:admin.apikey]]" class="form-control">
						<p class="form-text">
							[[openai:admin.apikey-help]]
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="apiBaseUrl">[[openai:admin.api-base-url]]</label>
						<input type="text" id="apiBaseUrl" name="apiBaseUrl" title="[[openai:admin.api-base-url]]" class="form-control">
						<p class="form-text">
							[[openai:admin.api-base-url-help]]
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="chatgpt-username">[[openai:admin.chatgpt-username]]</label>
						<input type="text" id="chatgpt-username" name="chatgpt-username" title="[[openai:admin.chatgpt-username]]" class="form-control">
						<p class="form-text">
							[[openai:admin.chatgpt-username-help, {config.relative_path}]]
						</p>
					</div>

					<div class="form-check form-switch">
						<input type="checkbox" class="form-check-input" id="enablePrivateMessages" name="enablePrivateMessages">
						<label for="enablePrivateMessages" class="form-check-label">[[openai:admin.enable-private-messages]]</label>
						<p class="form-text">
							[[openai:admin.enable-private-messages-help]]
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="model">[[openai:admin.model]]</label>
						<select class="form-select" id="model" name="model" title="[[openai:admin.model]]">
							<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
							<option value="gpt-4o-mini">gpt-4o-mini</option>
							<option value="gpt-4o">gpt-4o</option>
							<option value="gpt-4-turbo">gpt-4-turbo</option>
							<option value="gpt-4">gpt-4</option>
							<option value="gpt-4.1-mini">gpt-4.1-mini</option>
							<option value="gpt-4.1">gpt-4.1</option>
							<option value="gemini-2.0-flash">gemini-2.0-flash</option>
						</select>
					</div>
					<div class="">
						<label class="form-label" for="systemPrompt">[[openai:admin.system-prompt]]</label>
						<textarea class="form-control" id="systemPrompt" name="systemPrompt" title="[[openai:admin.system-prompt]]" placeholder="[[openai:admin.system-prompt-placeholder]]" rows="8"></textarea>
					</div>
				</div>

				<div class="">
					<h5 class="fw-bold tracking-tight settings-header">[[openai:admin.restrictions]]</h5>

					<div class="mb-3">
						<label class="form-label" for="minimumReputation">[[openai:admin.minimum-reputation]]</label>
						<input type="text" id="minimumReputation" name="minimumReputation" title="[[openai:admin.minimum-reputation]]" class="form-control">
						<p class="form-text">
							[[openai:admin.minimum-reputation-help]]
						</p>
					</div>
					<div class="mb-3">
						<label class="form-label" form="allowedGroups">[[openai:admin.allowed-groups]]</label>
						<select class="form-select" multiple id="allowedGroups" name="allowedGroups" size="10">
							{{{ each groups }}}
							<option value="{./displayName}">{./displayName}</option>
							{{{ end }}}
						</select>
						<p class="form-text">
							[[openai:admin.allowed-groups-help]]
						</p>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>
