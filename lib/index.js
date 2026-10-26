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
/** Schemastery configuration schema (fields optional unless marked required). */
const Config = z.object({
	command: z.string().min(1),
	timeoutMs: z.number().min(1e3),
	maxInputBytes: z.number().min(1024),
	maxOutputBytes: z.number().min(65536),
	allowedRoot: z.string().min(1),
	llmModel: z.string().min(1),
	llmBaseUrl: z.string().min(1),
	llmApiKeyEnv: z.string().min(1),
	llmAllowUrls: z.boolean(),
	allowPlugins: z.boolean(),
	allowPrivateUrls: z.boolean(),
	assetRoot: z.string().min(1)
});
/** Resolve configuration with defaults. */
function resolveConfig(config) {
	const command = (config.command ?? "python").trim();
	const timeoutMs = config.timeoutMs ?? 6e4;
	const maxInputBytes = config.maxInputBytes ?? 52428800;
	const maxOutputBytes = config.maxOutputBytes ?? 8388608;
	const llmApiKeyEnv = (config.llmApiKeyEnv ?? "OPENAI_API_KEY").trim();
	if (command.length === 0) throw new Error("dsh-markitdown: command must not be empty");
	return {
		command,
		timeoutMs,
		maxInputBytes,
		maxOutputBytes,
		allowedRoot: config.allowedRoot,
		llmModel: config.llmModel,
		llmBaseUrl: config.llmBaseUrl,
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
export { Config, apply, inject, name, resolveConfig };
