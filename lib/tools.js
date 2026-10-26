import { MarkitdownError, SUPPORTED_FORMATS, assertInsideRoot, checkEnvironment, convertBatch, convertOne, convertWithLlm } from "./runner.js";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
// src/tools.ts
/**
* MarkItDown model-facing tools.
*
* Two tools:
* - `markitdown_check` probes the Python environment and reports whether the
*   MarkItDown package (and, when configured, the LLM helper) is installed,
*   with setup guidance when something is missing;
* - `markitdown_convert` converts one source (local file, http(s) URL, or
*   stdin bytes) or a batch of sources to Markdown, inline or via output
*   files. When the plugin config sets llmModel, conversions run with LLM
*   image descriptions through the bundled helper.
*/
/** Maximum sources in one batch call. */
const MAX_BATCH = 16;
function hintsOf(args) {
	const hints = {
		...args.extensionHint === void 0 || args.extensionHint === "" ? {} : { extensionHint: args.extensionHint },
		...args.mimeHint === void 0 || args.mimeHint === "" ? {} : { mimeHint: args.mimeHint },
		...args.charsetHint === void 0 || args.charsetHint === "" ? {} : { charsetHint: args.charsetHint },
		...args.keepDataUris === true ? { keepDataUris: true } : {}
	};
	return Object.keys(hints).length === 0 ? void 0 : hints;
}
/** Resolve the output file path for one source under output/outputDir rules. */
async function resolveOutputPath(connection, args, source, batch) {
	if (!batch && args.output !== void 0 && args.output !== "") {
		if (!isAbsolute(args.output)) throw new MarkitdownError(`dsh-markitdown: output path must be absolute, got "${args.output}"`);
		if (connection.allowedRoot !== void 0) await assertInsideRoot(connection.allowedRoot, args.output, "output");
		return args.output;
	}
	if (args.outputDir !== void 0 && args.outputDir !== "") {
		if (!isAbsolute(args.outputDir)) throw new MarkitdownError(`dsh-markitdown: outputDir must be absolute, got "${args.outputDir}"`);
		const leaf = source === "(stdin)" ? "stdin" : basename(source).replace(/\.[^.]+$/u, "") || "output";
		const target = join(args.outputDir, `${leaf}.md`);
		if (connection.allowedRoot !== void 0) await assertInsideRoot(connection.allowedRoot, target, "output");
		return target;
	}
}
/** Register the two conversion tools. */
function registerTools(ctx, connection) {
	const formatList = SUPPORTED_FORMATS.map((format) => `.${format.extension} (${format.extracts})`).join("; ");
	const llmNote = connection.llmModel !== void 0 ? ` LLM-assisted conversion is ON (model ${connection.llmModel}, API key from ${connection.llmApiKeyEnv}): embedded images are described by the LLM instead of emitted as data URIs.` : "";
	ctx.tools.register(defineTool({
		name: "markitdown_check",
		description: [
			"Check whether the MarkItDown Python package is available to this plugin.",
			"Use first before any markitdown_convert call; the result reports the installed version",
			"or the exact setup command when MarkItDown is missing."
		].join(" "),
		parameters: {},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ready: {
						type: "boolean",
						required: true,
						description: "True when conversions can run."
					},
					detail: {
						type: "string",
						required: true,
						description: "Installed version or setup guidance."
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.ready ? `MarkItDown ready: ${value.detail}` : `MarkItDown not ready: ${value.detail}`
			}]
		},
		execute: async () => {
			const result = await checkEnvironment(connection);
			return {
				ready: result.ready,
				detail: result.detail
			};
		}
	}));
	ctx.tools.register(defineTool({
		name: "markitdown_convert",
		description: [
			"Convert one source — a local file path, an http(s) URL (e.g. a YouTube link), or stdin bytes — to Markdown with Microsoft MarkItDown.",
			`Supported local inputs: ${formatList}.`,
			"Use `paths` for a batch (up to " + String(MAX_BATCH) + "); per-file failures do not abort the batch.",
			"Pass output to write the single-source result to a file, or outputDir to write <name>.md per source; otherwise Markdown comes back inline.",
			"stdinBase64 needs an extensionHint or mimeHint so MarkItDown can pick a converter.",
			"Hints map to the MarkItDown CLI: extensionHint (-x), mimeHint (-m), charsetHint (-c), keepDataUris.",
			"Third-party converter plugins (CLI -p) run only when the plugin admin enables allowPlugins in the config.",
			llmNote,
			"Run markitdown_check first if the environment has not been verified this session."
		].join(" "),
		parameters: {
			path: {
				type: "string",
				description: "Absolute local file path or http(s) URL of one source."
			},
			paths: {
				type: "array",
				items: { type: "string" },
				description: "Batch of absolute local paths or http(s) URLs (max " + String(MAX_BATCH) + "); combines with path."
			},
			stdinBase64: {
				type: "string",
				description: "Canonical base64 bytes fed to MarkItDown stdin; requires extensionHint or mimeHint."
			},
			extensionHint: {
				type: "string",
				description: "CLI -x: extension hint; also admits local files whose extension is not in the built-in list."
			},
			mimeHint: {
				type: "string",
				description: "CLI -m: MIME-type hint."
			},
			charsetHint: {
				type: "string",
				description: "CLI -c: charset hint, e.g. UTF-8."
			},
			keepDataUris: {
				type: "boolean",
				description: "CLI --keep-data-uris: keep base64 image payloads instead of truncating."
			},
			output: {
				type: "string",
				description: "Absolute output .md path; single-source only."
			},
			outputDir: {
				type: "string",
				description: "Absolute directory; writes <source-name>.md per converted source."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						description: "The single source that was converted."
					},
					markdown: {
						type: "string",
						description: "Converted Markdown for the single source (present unless an output path was used)."
					},
					output: {
						type: "string",
						description: "The file the single-source Markdown was written to."
					},
					results: {
						type: "array",
						description: "Per-source outcomes when a batch (or stdin) was converted.",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								source: {
									type: "string",
									required: true
								},
								markdown: { type: "string" },
								output: { type: "string" },
								error: { type: "string" }
							}
						}
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.output !== void 0 ? `Converted ${value.path} → ${value.output}` : value.results !== void 0 ? `Converted ${value.results.length} source(s): ${value.results.map((r) => r.error !== void 0 ? `${r.source} (failed)` : r.output ?? r.source).join(", ")}` : `Converted ${value.path} (${value.markdown?.length ?? 0} chars of Markdown)`
			}]
		},
		execute: async (args) => {
			const sources = [...args.path !== void 0 && args.path !== "" ? [args.path] : [], ...(args.paths ?? []).filter((source) => source !== "")];
			const useStdin = args.stdinBase64 !== void 0 && args.stdinBase64 !== "";
			if (!useStdin && sources.length === 0) throw new MarkitdownError("dsh-markitdown: pass path, paths, or stdinBase64");
			if (useStdin && sources.length > 0) throw new MarkitdownError("dsh-markitdown: stdinBase64 cannot combine with path/paths");
			if (sources.length > MAX_BATCH) throw new MarkitdownError(`dsh-markitdown: at most ${MAX_BATCH} sources per batch, got ${sources.length}`);
			if (!useStdin && args.output !== void 0 && args.output !== "" && sources.length !== 1) throw new MarkitdownError("dsh-markitdown: output applies to a single source; use outputDir for batches");
			const hints = hintsOf(args);
			const specs = useStdin ? [{
				stdinBase64: args.stdinBase64,
				hints
			}] : sources.map((source) => ({
				source,
				hints
			}));
			const convert = connection.llmModel !== void 0 ? convertWithLlm : convertOne;
			if (sources.length <= 1) {
				const spec = specs[0];
				const source = useStdin ? "(stdin)" : spec.source;
				const markdown = await convert(connection, spec);
				const outputPath = await resolveOutputPath(connection, args, source, false);
				if (outputPath !== void 0) {
					await mkdir(dirname(outputPath), { recursive: true });
					await writeFile(outputPath, markdown, "utf8");
					return useStdin ? { results: [{
						source,
						output: outputPath
					}] } : {
						path: source,
						output: outputPath
					};
				}
				return useStdin ? { results: [{
					source,
					markdown
				}] } : {
					path: source,
					markdown
				};
			}
			const converted = await convertBatch(connection, specs);
			if (args.outputDir === void 0 || args.outputDir === "") return { results: converted };
			const results = [];
			for (const result of converted) {
				if (result.markdown === void 0) {
					results.push(result);
					continue;
				}
				const outputPath = await resolveOutputPath(connection, args, result.source, true);
				if (outputPath === void 0) {
					results.push(result);
					continue;
				}
				await mkdir(dirname(outputPath), { recursive: true });
				await writeFile(outputPath, result.markdown, "utf8");
				results.push({
					source: result.source,
					output: outputPath
				});
			}
			return { results };
		}
	}));
}
export { registerTools };
