import { stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { spawn } from "node:child_process";
// src/runner.ts
/**
* MarkItDown Python CLI runner.
*
* The plugin never links MarkItDown; it spawns the configured Python
* interpreter as `python -m markitdown <args>` and captures stdout. Setup
* failures (interpreter missing, package missing) map to actionable
* guidance instead of raw spawn errors.
*/
/** Error type surfaced to the model with setup guidance attached. */
var MarkitdownError = class extends Error {
	name = "MarkitdownError";
};
/** Setup hint shown whenever the interpreter or package is missing. */
function setupGuidance(command) {
	return [
		`MarkItDown is not available under "${command}".`,
		"Install it into that Python environment with:",
		`  ${command} -m pip install 'markitdown[all]'`,
		"(the [all] extra enables optional PDF/audio/YouTube handlers; core conversions work with plain `markitdown`)",
		"Or point the plugin at another interpreter via the `command` config field."
	].join("\n");
}
/**
* Formats accepted by `markitdown_convert` (Microsoft MarkItDown core
* converters; optional extras widen audio/YouTube coverage).
*/
const SUPPORTED_FORMATS = [
	{
		extension: "pdf",
		extracts: "text content"
	},
	{
		extension: "docx",
		extracts: "paragraphs, tables, embedded images (as data URIs)"
	},
	{
		extension: "doc",
		extracts: "text content (legacy Word)"
	},
	{
		extension: "pptx",
		extracts: "slides with slide numbers"
	},
	{
		extension: "ppt",
		extracts: "slides (legacy PowerPoint)"
	},
	{
		extension: "xlsx",
		extracts: "sheets as Markdown tables"
	},
	{
		extension: "xls",
		extracts: "sheets as Markdown tables (legacy Excel)"
	},
	{
		extension: "csv",
		extracts: "rows as a Markdown table"
	},
	{
		extension: "json",
		extracts: "structured text"
	},
	{
		extension: "xml",
		extracts: "structured text"
	},
	{
		extension: "html",
		extracts: "main content as Markdown"
	},
	{
		extension: "htm",
		extracts: "main content as Markdown"
	},
	{
		extension: "epub",
		extracts: "chapters as Markdown"
	},
	{
		extension: "md",
		extracts: "passed through with front-matter kept"
	},
	{
		extension: "msg",
		extracts: "e-mail subject, body and headers (Outlook)"
	},
	{
		extension: "zip",
		extracts: "each contained file converted in place"
	},
	{
		extension: "jpg",
		extracts: "EXIF metadata and OCR text when available"
	},
	{
		extension: "jpeg",
		extracts: "EXIF metadata and OCR text when available"
	},
	{
		extension: "png",
		extracts: "EXIF metadata and OCR text when available"
	},
	{
		extension: "gif",
		extracts: "metadata"
	},
	{
		extension: "tiff",
		extracts: "EXIF metadata and OCR text when available"
	},
	{
		extension: "bmp",
		extracts: "metadata"
	},
	{
		extension: "wav",
		extracts: "speech transcription ([all] extra)"
	},
	{
		extension: "mp3",
		extracts: "speech transcription ([all] extra)"
	}
];
const SUPPORTED_BY_EXT = new Map(SUPPORTED_FORMATS.map((format) => [format.extension, format]));
/** Supported extension list for tool descriptions. */
function supportedExtensions() {
	return SUPPORTED_FORMATS.map((format) => format.extension);
}
/** Spawn the interpreter with arguments and collect output under the timeout. */
async function run(connection, args) {
	return await new Promise((resolvePromise, rejectPromise) => {
		let child;
		try {
			child = spawn(connection.command, args, { stdio: [
				"ignore",
				"pipe",
				"pipe"
			] });
		} catch (error) {
			rejectPromise(new MarkitdownError(`dsh-markitdown: failed to start "${connection.command}": ${error.message}\n\n${setupGuidance(connection.command)}`));
			return;
		}
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			rejectPromise(new MarkitdownError(`dsh-markitdown: "${connection.command} -m markitdown" timed out after ${connection.timeoutMs} ms`));
		}, connection.timeoutMs);
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", (error) => {
			clearTimeout(timer);
			rejectPromise(new MarkitdownError(`dsh-markitdown: cannot run "${connection.command}": ${error.message}\n\n${setupGuidance(connection.command)}`));
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) {
				resolvePromise({
					stdout,
					stderr
				});
				return;
			}
			const detail = stderr.trim().split(/\r?\n/u).slice(-5).join("\n");
			if (detail.includes("No module named markitdown") || /ModuleNotFoundError/u.test(detail)) {
				rejectPromise(new MarkitdownError(`dsh-markitdown: the markitdown package is missing.\n\n${setupGuidance(connection.command)}`));
				return;
			}
			rejectPromise(new MarkitdownError(`dsh-markitdown: markitdown exited with code ${code ?? "unknown"}.\n${detail}`));
		});
	});
}
/** Probe the environment and report whether conversions are ready. */
async function checkEnvironment(connection) {
	try {
		const version = (await run(connection, ["-c", "import importlib.metadata as m; print(m.version(\"markitdown\"))"])).stdout.trim();
		return {
			command: connection.command,
			ready: true,
			version,
			detail: `markitdown ${version} is available under "${connection.command}".`
		};
	} catch (error) {
		if (error instanceof MarkitdownError) return {
			command: connection.command,
			ready: false,
			detail: error.message
		};
		throw error;
	}
}
/**
* Convert one file to Markdown through `python -m markitdown`.
* @param connection - Resolved runtime settings.
* @param path - Absolute source file path.
* @returns The Markdown text on stdout.
*/
async function convertFile(connection, path) {
	if (!isAbsolute(path)) throw new MarkitdownError(`dsh-markitdown: path must be absolute, got "${path}"`);
	const extension = path.split(".").pop()?.toLowerCase() ?? "";
	if (!SUPPORTED_BY_EXT.has(extension)) throw new MarkitdownError(`dsh-markitdown: ".${extension}" is not a MarkItDown input. Supported: ${supportedExtensions().map((ext) => `.${ext}`).join(", ")}.`);
	let size;
	try {
		size = (await stat(path)).size;
	} catch {
		throw new MarkitdownError(`dsh-markitdown: cannot read "${path}" (file missing or not readable)`);
	}
	if (size > connection.maxInputBytes) throw new MarkitdownError(`dsh-markitdown: "${path}" is ${size} bytes, above the ${connection.maxInputBytes} byte limit`);
	const { stdout } = await run(connection, [
		"-m",
		"markitdown",
		path
	]);
	return stdout;
}
export { MarkitdownError, SUPPORTED_FORMATS, checkEnvironment, convertFile, setupGuidance, supportedExtensions };
