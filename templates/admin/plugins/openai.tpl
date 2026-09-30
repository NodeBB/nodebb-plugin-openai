<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form role="form" class="openai-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">{{tx("openai:admin.general")}}</h5>

					<div class="mb-3">
						<label class="form-label" for="apikey">{{tx("openai:admin.apikey")}}</label>
						<input type="text" id="apikey" name="apikey" title="[[openai:admin.apikey]]" class="form-control">
						<p class="form-text">
							{{tx("openai:admin.apikey-help")}}
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="apiBaseUrl">{{tx("openai:admin.api-base-url")}}</label>
						<input type="text" id="apiBaseUrl" name="apiBaseUrl" title="[[openai:admin.api-base-url]]" class="form-control">
						<p class="form-text">
							{{tx("openai:admin.api-base-url-help")}}
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="chatgpt-username">{{tx("openai:admin.chatgpt-username")}}</label>
						<input type="text" id="chatgpt-username" name="chatgpt-username" title="[[openai:admin.chatgpt-username]]" class="form-control">
						<p class="form-text">
							{{tx("openai:admin.chatgpt-username-help", config.relative_path)}}
						</p>
					</div>

					<div class="form-check form-switch">
						<input type="checkbox" class="form-check-input" id="enablePrivateMessages" name="enablePrivateMessages">
						<label for="enablePrivateMessages" class="form-check-label">{{tx("openai:admin.enable-private-messages")}}</label>
						<p class="form-text">
							{{tx("openai:admin.enable-private-messages-help")}}
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="model">{{tx("openai:admin.model")}}</label>
						<select class="form-select" id="model" name="model" title="[[openai:admin.model]]">
							{{{ each models }}}
							<option value="{./id}">{./id}</option>
							{{{ end }}}
						</select>
					</div>
					<div class="">
						<label class="form-label" for="systemPrompt">{{tx("openai:admin.system-prompt")}}</label>
						<textarea class="form-control" id="systemPrompt" name="systemPrompt" title="{{tx("openai:admin.system-prompt")}}" placeholder="{{tx("openai:admin.system-prompt-placeholder")}}" rows="8"></textarea>
					</div>
				</div>

				<div class="">
					<h5 class="fw-bold tracking-tight settings-header">{{tx("openai:admin.restrictions")}}</h5>

					<div class="mb-3">
						<label class="form-label" for="minimumReputation">{{tx("openai:admin.minimum-reputation")}}</label>
						<input type="text" id="minimumReputation" name="minimumReputation" title="[[openai:admin.minimum-reputation]]" class="form-control">
						<p class="form-text">
							{{tx("openai:admin.minimum-reputation-help")}}
						</p>
					</div>
					<div class="mb-3">
						<label class="form-label" form="allowedGroups">{{tx("openai:admin.allowed-groups")}}</label>
						<select class="form-select" multiple id="allowedGroups" name="allowedGroups" size="10">
							{{{ each groups }}}
							<option value="{./displayName}">{./displayName}</option>
							{{{ end }}}
						</select>
						<p class="form-text">
							{{tx("openai:admin.allowed-groups-help")}}
						</p>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>
