<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form role="form" class="openai-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">General</h5>

					<div class="mb-3">
						<label class="form-label" for="apikey">API Key</label>
						<input type="text" id="apikey" name="apikey" title="API Key" class="form-control">
						<p class="form-text">
							Get your <a href="https://platform.openai.com/api-keys">API Key</a> and enter it above. Requires a restart.
						</p>
					</div>
					<div class="mb-3">
						<label class="form-label" for="chatgpt-username">ChatGPT Username</label>
						<input type="text" id="chatgpt-username" name="chatgpt-username" title="ChatGPT Username" class="form-control">
						<p class="form-text">
							<a href="{config.relative_path}/admin/manage/users">Create a user</a> and enter their username. Other users can mention this user to ask questions to ChatGPT or send private messages if enabled below.
						</p>
					</div>

					<div class="form-check form-switch">
						<input type="checkbox" class="form-check-input" id="enablePrivateMessages" name="enablePrivateMessages">
						<label for="enablePrivateMessages" class="form-check-label">Enable Private Messages</label>
						<p class="form-text">
							If enabled users can send ChatGPT user private messages.
						</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="model">Model</label>
						<select class="form-select" id="model" name="model" title="Model">
							<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
							<option value="gpt-4o-mini">gpt-4o-mini</option>
							<option value="gpt-4o">gpt-4o</option>
							<option value="gpt-4-turbo">gpt-4-turbo</option>
							<option value="gpt-4">gpt-4</option>
						</select>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>