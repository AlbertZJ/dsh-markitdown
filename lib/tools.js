import { SUPPORTED_FORMATS, checkEnvironment, convertFile } from "./runner.js";
import { writeFile } from "node:fs/promises";
import { defineTool } from "@deepseek-ai/dsh-tools";
// src/tools.ts
/**
* MarkItDown model-facing tools.
*
* Two tools:
* - `markitdown_check` probes the Python environment and reports whether the
*   MarkItDown package is installed (with setup guidance when it is not);
* - `markitdown_convert` converts one supported file to Markdown and returns
*   the text (or writes it next to the source when `output` is given).
*/
/** Register the two conversion tools. */
function registerTools(ctx, connection) {
	const formatList = SUPPORTED_FORMATS.map((format) => `.${format.extension} (${format.extracts})`).join("; ");
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
			"Convert one file to Markdown with Microsoft MarkItDown and return the Markdown text.",
			`Supported inputs: ${formatList}.`,
			"Pass output to write the result to a file instead of returning it inline (use for large documents).",
			"Run markitdown_check first if the environment has not been verified this session."
		].join(" "),
		parameters: {
			path: {
				type: "string",
				description: "Absolute path of the source file."
			},
			output: {
				type: "string",
				description: "Optional absolute path of the Markdown file to write; omit to return the text inline."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						required: true,
						description: "The source file that was converted."
					},
					markdown: {
						type: "string",
						description: "The converted Markdown text (present unless output was given)."
					},
					output: {
						type: "string",
						description: "The file the Markdown was written to (present only when output was given)."
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.output !== void 0 ? `Converted ${value.path} → ${value.output}` : `Converted ${value.path} (${value.markdown?.length ?? 0} chars of Markdown)`
			}]
		},
		execute: async (args) => {
			const markdown = await convertFile(connection, args.path);
			if (args.output !== void 0 && args.output !== "") {
				await writeFile(args.output, markdown, "utf8");
				return {
					path: args.path,
					output: args.output
				};
			}
			return {
				path: args.path,
				markdown
			};
		}
	}));
}
export { registerTools };
