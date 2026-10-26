import { registerSkills } from "./skills.js";
import { registerTools } from "./tools.js";
import z from "@deepseek-ai/schemastery";
// src/index.ts
/** Cordis plugin identity. */
const name = "dsh-markitdown";
/** Registries this plugin needs. */
const inject = [
	"tools",
	"skills",
	"credentials"
];
/** One provider profile as stored under `llmProviders`. */
const LlmProviderProfileSchema = z.object({
	baseUrl: z.string(),
	model: z.string(),
	apiKeyEnv: z.string()
});
/** Schemastery configuration schema (fields optional unless marked required).
*  The LLM fields are volatile: the dsh settings service only projects
*  namespaces with at least one volatile field, and the settings tab edits
*  these live without a plugin remount. */
const Config = z.object({
	command: z.string().min(1),
	timeoutMs: z.number().min(1e3),
	maxInputBytes: z.number().min(1024),
	maxOutputBytes: z.number().min(65536),
	allowedRoot: z.string().min(1),
	llmProvider: z.string().min(1).volatile(),
	llmProviders: z.dict(LlmProviderProfileSchema).volatile(),
	llmModel: z.string().min(1).volatile(),
	llmBaseUrl: z.string().min(1).volatile(),
	llmApiKeyEnv: z.string().min(1).volatile(),
	llmAllowUrls: z.boolean(),
	allowPlugins: z.boolean(),
	allowPrivateUrls: z.boolean(),
	assetRoot: z.string().min(1)
});
/** Credential reference a provider profile falls back to when it names none. */
function defaultKeyEnv(providerId) {
	if (providerId === "openai") return "OPENAI_API_KEY";
	if (providerId === "deepseek") return "DEEPSEEK_API_KEY";
	if (providerId === "custom") return "MARKITDOWN_API_KEY";
	return "OPENAI_API_KEY";
}
/** Resolve configuration with defaults. */
function resolveConfig(config) {
	const command = (config.command ?? "python").trim();
	const timeoutMs = config.timeoutMs ?? 6e4;
	const maxInputBytes = config.maxInputBytes ?? 52428800;
	const maxOutputBytes = config.maxOutputBytes ?? 8388608;
	const activeId = config.llmProvider?.trim() === "" ? void 0 : config.llmProvider?.trim();
	const active = activeId === void 0 ? void 0 : config.llmProviders?.[activeId];
	const llmModel = (active === void 0 ? config.llmModel : active.model)?.trim() || void 0;
	const llmBaseUrl = (active === void 0 ? config.llmBaseUrl : active.baseUrl)?.trim() || void 0;
	const llmApiKeyEnv = (active === void 0 ? config.llmApiKeyEnv : active.apiKeyEnv)?.trim() || defaultKeyEnv(activeId);
	if (command.length === 0) throw new Error("dsh-markitdown: command must not be empty");
	return {
		command,
		timeoutMs,
		maxInputBytes,
		maxOutputBytes,
		allowedRoot: config.allowedRoot,
		llmModel,
		llmBaseUrl,
		llmApiKeyEnv,
		llmAllowUrls: config.llmAllowUrls ?? false,
		allowPlugins: config.allowPlugins ?? false,
		allowPrivateUrls: config.allowPrivateUrls ?? false,
		assetRoot: config.assetRoot
	};
}
/** Activate the plugin: tools plus the bundled skill provider. */
function apply(ctx, config = {}) {
	const resolved = resolveConfig(config);
	const resolveApiKey = async () => (await ctx.credentials.resolve(resolved.llmApiKeyEnv))?.value;
	registerTools(ctx, {
		...resolved,
		resolveApiKey
	});
	registerSkills(ctx, "dsh-markitdown", resolved.assetRoot);
}
export { Config, apply, defaultKeyEnv, inject, name, resolveConfig };
