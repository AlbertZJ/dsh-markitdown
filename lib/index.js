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
	describeImages: z.boolean().volatile(),
	llmAllowUrls: z.boolean(),
	allowPlugins: z.boolean(),
	allowPrivateUrls: z.boolean(),
	assetRoot: z.string().min(1)
});
/** Shared protocol cosmokit uses for live configuration references. */
const VOLATILE_WRITE = Symbol.for("cosmokit.volatile.write");
/**
* Read one parsed config field. Volatile fields reach the plugin as runtime
* references (their value only changes through the owning loader), so they
* must be unwrapped before use; ordinary fields pass through unchanged.
*/
function readField(value) {
	if (value === null || typeof value !== "object") return value;
	if (!(VOLATILE_WRITE in value)) return value;
	return value.get();
}
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
	const providerId = readField(config.llmProvider)?.trim();
	const activeId = providerId === "" ? void 0 : providerId;
	const profiles = readField(config.llmProviders);
	const active = activeId === void 0 ? void 0 : profiles?.[activeId];
	const llmModel = (active === void 0 ? readField(config.llmModel) : active.model)?.trim() || void 0;
	const llmBaseUrl = (active === void 0 ? readField(config.llmBaseUrl) : active.baseUrl)?.trim() || void 0;
	const llmApiKeyEnv = (active === void 0 ? readField(config.llmApiKeyEnv) : active.apiKeyEnv)?.trim() || defaultKeyEnv(activeId);
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
		describeImages: readField(config.describeImages) ?? false,
		llmAllowUrls: config.llmAllowUrls ?? false,
		allowPlugins: config.allowPlugins ?? false,
		allowPrivateUrls: config.allowPrivateUrls ?? false,
		assetRoot: config.assetRoot
	};
}
/** Activate the plugin: tools plus the bundled skill provider. */
function apply(ctx, config = {}) {
	const base = resolveConfig(config);
	const connection = {
		command: base.command,
		timeoutMs: base.timeoutMs,
		maxInputBytes: base.maxInputBytes,
		maxOutputBytes: base.maxOutputBytes,
		allowedRoot: base.allowedRoot,
		get llmModel() {
			return resolveConfig(config).llmModel;
		},
		get llmBaseUrl() {
			return resolveConfig(config).llmBaseUrl;
		},
		get llmApiKeyEnv() {
			return resolveConfig(config).llmApiKeyEnv;
		},
		get describeImages() {
			return resolveConfig(config).describeImages;
		},
		resolveApiKey: async () => (await ctx.credentials.resolve(resolveConfig(config).llmApiKeyEnv))?.value,
		llmAllowUrls: base.llmAllowUrls,
		allowPlugins: base.allowPlugins,
		allowPrivateUrls: base.allowPrivateUrls
	};
	registerTools(ctx, connection);
	registerSkills(ctx, "dsh-markitdown", base.assetRoot);
}
export { Config, apply, defaultKeyEnv, inject, name, resolveConfig };
