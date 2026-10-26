import { registerSkills } from "./skills.js";
import { registerTools } from "./tools.js";
import z from "@deepseek-ai/schemastery";
// src/index.ts
/** Cordis plugin identity. */
const name = "dsh-markitdown";
/** Registries this plugin needs. */
const inject = ["tools", "skills"];
/** Schemastery configuration schema (fields optional unless marked required). */
const Config = z.object({
	command: z.string().min(1),
	timeoutMs: z.number().min(1e3),
	maxInputBytes: z.number().min(1024),
	maxOutputBytes: z.number().min(65536),
	allowedRoot: z.string().min(1),
	assetRoot: z.string().min(1)
});
/** Resolve configuration with defaults. */
function resolveConfig(config) {
	const command = (config.command ?? "python").trim();
	const timeoutMs = config.timeoutMs ?? 6e4;
	const maxInputBytes = config.maxInputBytes ?? 52428800;
	const maxOutputBytes = config.maxOutputBytes ?? 8388608;
	if (command.length === 0) throw new Error("dsh-markitdown: command must not be empty");
	return {
		command,
		timeoutMs,
		maxInputBytes,
		maxOutputBytes,
		allowedRoot: config.allowedRoot,
		assetRoot: config.assetRoot
	};
}
/** Activate the plugin: tools plus the bundled skill provider. */
function apply(ctx, config = {}) {
	const resolved = resolveConfig(config);
	registerTools(ctx, resolved);
	registerSkills(ctx, "dsh-markitdown", resolved.assetRoot);
}
export { Config, apply, inject, name, resolveConfig };
