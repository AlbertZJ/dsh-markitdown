import { realpath, stat } from "node:fs/promises";
import { isAbsolute, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { Buffer } from "node:buffer";
// src/runner.ts
/**
* MarkItDown Python CLI runner.
*
* The plugin never links MarkItDown; it spawns the configured Python
* interpreter as `python -m markitdown <args>` and captures stdout. Setup
* failures (interpreter missing, package missing) map to actionable
* guidance instead of raw spawn errors.
*
* LLM-assisted conversion (image descriptions instead of raw data URIs) is
* API-only in MarkItDown, so it runs through the bundled helper script
* `python/llm_convert.py`, which reads the API key from a named environment
* variable — the key never enters the plugin configuration.
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
		extracts: "paragraphs, tables, embedded images (as data URIs or LLM descriptions)"
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
/**
* Extensions admitted via extensionHint beyond the built-in supported list:
* text-shaped formats MarkItDown's plain-text converter handles. Keeps the
* hint gate aligned with the allowlist instead of accepting arbitrary input.
*/
const HINTABLE_EXTENSIONS = /* @__PURE__ */ new Set([
	"txt",
	"log",
	"yaml",
	"yml",
	"toml",
	"ini",
	"cfg",
	"conf",
	"rss",
	"atom",
	"py",
	"js",
	"ts",
	"css",
	"sh"
]);
/**
* Validate one hinted extension: normalize (lowercase, strip one leading
* dot), constrain the charset, and require membership in the supported or
* hintable lists.
*/
function sanitizeHintedExtension(hint) {
	const normalized = hint.trim().toLowerCase().replace(/^\.+/, "");
	if (!/^[a-z0-9]{1,10}$/u.test(normalized)) throw new MarkitdownError(`dsh-markitdown: extensionHint "${hint}" is not a safe extension name`);
	if (!SUPPORTED_BY_EXT.has(normalized) && !HINTABLE_EXTENSIONS.has(normalized)) throw new MarkitdownError(`dsh-markitdown: extensionHint ".${normalized}" is not supported or hintable. Supported: ${supportedExtensions().join(", ")}; hintable extras: ${[...HINTABLE_EXTENSIONS].join(", ")}.`);
	return normalized;
}
/** Append the CLI flag form of every provided hint. */
function appendHintFlags(args, hints, connection) {
	if ((hints?.extensionHint ?? "") !== "") args.push("-x", sanitizeHintedExtension(hints?.extensionHint));
	if ((hints?.mimeHint ?? "") !== "") args.push("-m", hints?.mimeHint);
	if ((hints?.charsetHint ?? "") !== "") args.push("-c", hints?.charsetHint);
	if (hints?.keepDataUris === true) args.push("--keep-data-uris");
	if (connection.allowPlugins) args.push("-p");
}
/** Spawn the interpreter with arguments and collect output under the timeout and output cap. */
async function run(connection, args, input) {
	return await new Promise((resolvePromise, rejectPromise) => {
		let child;
		try {
			child = spawn(connection.command, args, { stdio: [
				input === void 0 ? "ignore" : "pipe",
				"pipe",
				"pipe"
			] });
		} catch (error) {
			rejectPromise(new MarkitdownError(`dsh-markitdown: failed to start "${connection.command}": ${error.message}\n\n${setupGuidance(connection.command)}`));
			return;
		}
		let stdout = "";
		let stderr = "";
		let outputBytes = 0;
		let killed = false;
		const childStdout = child.stdout;
		const childStderr = child.stderr;
		if (childStdout === null || childStderr === null) {
			rejectPromise(new MarkitdownError(`dsh-markitdown: failed to capture output of "${connection.command}"`));
			return;
		}
		const fail = (error) => {
			if (!killed) {
				killed = true;
				child.kill("SIGKILL");
			}
			rejectPromise(error);
		};
		const timer = setTimeout(() => {
			fail(new MarkitdownError(`dsh-markitdown: "${connection.command}" conversion timed out after ${connection.timeoutMs} ms`));
		}, connection.timeoutMs);
		const watchOutput = (chunk) => {
			outputBytes += Buffer.byteLength(chunk);
			if (outputBytes > connection.maxOutputBytes) fail(new MarkitdownError(`dsh-markitdown: conversion output exceeded ${connection.maxOutputBytes} bytes; pass an output file or raise maxOutputBytes`));
		};
		childStdout.setEncoding("utf8");
		childStderr.setEncoding("utf8");
		childStdout.on("data", (chunk) => {
			watchOutput(chunk);
			stdout += chunk;
		});
		childStderr.on("data", (chunk) => {
			watchOutput(chunk);
			stderr += chunk;
		});
		child.on("error", (error) => {
			clearTimeout(timer);
			fail(new MarkitdownError(`dsh-markitdown: cannot run "${connection.command}": ${error.message}\n\n${setupGuidance(connection.command)}`));
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (killed) return;
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
		if (input !== void 0) {
			const childStdin = child.stdin;
			if (childStdin === null) {
				fail(new MarkitdownError(`dsh-markitdown: failed to open stdin for "${connection.command}"`));
				return;
			}
			childStdin.on("error", () => {});
			childStdin.write(input);
			childStdin.end();
		}
	});
}
/** True when the source is an http(s) URL (e.g. a YouTube page). */
function isUrl(source) {
	return /^https?:\/\//iu.test(source);
}
/** IPv4 string to a 32-bit number for range checks. */
function ipv4ToNumber(address) {
	const parts = address.split(".");
	if (parts.length !== 4) return void 0;
	let value = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/u.test(part)) return void 0;
		const octet = Number(part);
		if (octet > 255) return void 0;
		value = value * 256 + octet;
	}
	return value;
}
/** True when an IP address is not globally routable (SSRF target). */
function isNonPublicAddress(address) {
	if (address.includes(":")) {
		const compressed = address.toLowerCase().replace(/^\[[^\]]*\]$/u, "");
		if (compressed === "::" || compressed === "::1") return true;
		if (/^fe[89ab]/u.test(compressed)) return true;
		if (compressed.startsWith("fc") || compressed.startsWith("fd")) return true;
		return false;
	}
	const value = ipv4ToNumber(address);
	if (value === void 0) return true;
	if (value === 0) return true;
	if (value >>> 24 === 127) return true;
	if (value >>> 24 === 10) return true;
	if (value >>> 20 === 2753) return true;
	if (value >>> 16 === 49320) return true;
	if (value >>> 16 === 43518) return true;
	return false;
}
/** Resolve every address for one host and refuse non-public targets. */
async function assertHostPublic(hostname) {
	let addresses;
	try {
		addresses = await lookup(hostname, { all: true });
	} catch {
		throw new MarkitdownError(`dsh-markitdown: cannot resolve URL host "${hostname}"`);
	}
	for (const { address } of addresses) if (isNonPublicAddress(address)) throw new MarkitdownError(`dsh-markitdown: URL host "${hostname}" resolves to non-public address ${address}; set allowPrivateUrls to permit internal targets`);
}
const REDIRECT_STATUSES = /* @__PURE__ */ new Set([
	301,
	302,
	303,
	307,
	308
]);
const MAX_REDIRECT_HOPS = 5;
/**
* Egress policy for URL sources (SSRF guard): the initial host and every
* redirect hop must resolve to globally routable addresses, and redirect
* targets must stay on http(s). No-op when allowPrivateUrls is set.
*/
async function assertUrlEgress(connection, rawUrl) {
	if (connection.allowPrivateUrls) return;
	let current = new URL(rawUrl);
	for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
		if (current.username !== "" || current.password !== "") throw new MarkitdownError("dsh-markitdown: URLs with embedded credentials are rejected");
		if (!/^https?:$/iu.test(current.protocol)) throw new MarkitdownError(`dsh-markitdown: URL scheme ${current.protocol} is not allowed`);
		await assertHostPublic(current.hostname);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), Math.min(connection.timeoutMs, 1e4));
		let response;
		try {
			response = await fetch(current, {
				method: "GET",
				redirect: "manual",
				signal: controller.signal
			}).catch(() => void 0);
		} finally {
			clearTimeout(timer);
		}
		const location = response?.headers.get("location");
		if (response === void 0 || !REDIRECT_STATUSES.has(response.status) || location === null) {
			await response?.body?.cancel().catch(() => {});
			return;
		}
		await response.body?.cancel().catch(() => {});
		if (location == null) return;
		current = new URL(location, current);
	}
	throw new MarkitdownError("dsh-markitdown: URL exceeded the redirect limit during egress checks");
}
/** Absolute path of the bundled LLM helper script. */
function llmHelperPath() {
	return fileURLToPath(new URL("../python/llm_convert.py", import.meta.url));
}
/** Convert one source to Markdown through the MarkItDown CLI (`python -m markitdown`). */
async function convertOne(connection, spec) {
	const hints = spec.hints;
	const hasFormatHint = (hints?.extensionHint ?? "") !== "" || (hints?.mimeHint ?? "") !== "";
	if (spec.stdinBase64 !== void 0) {
		if (spec.source !== void 0) throw new MarkitdownError("dsh-markitdown: pass either source or stdinBase64, not both");
		if (!hasFormatHint) throw new MarkitdownError("dsh-markitdown: stdinBase64 requires an extensionHint or mimeHint so MarkItDown can pick a converter");
		const decoded = Buffer.from(spec.stdinBase64, "base64");
		if (decoded.toString("base64") !== spec.stdinBase64) throw new MarkitdownError("dsh-markitdown: stdinBase64 is not canonical base64");
		if (decoded.byteLength > connection.maxInputBytes) throw new MarkitdownError(`dsh-markitdown: stdin payload is ${decoded.byteLength} bytes, above the ${connection.maxInputBytes} byte limit`);
		const args = ["-m", "markitdown"];
		appendHintFlags(args, hints, connection);
		const { stdout } = await run(connection, args, new Uint8Array(decoded));
		return stdout;
	}
	const source = spec.source;
	if (source === void 0) throw new MarkitdownError("dsh-markitdown: nothing to convert — pass source or stdinBase64");
	if (isUrl(source)) {
		await assertUrlEgress(connection, source);
		const args = ["-m", "markitdown"];
		appendHintFlags(args, hints, connection);
		args.push(source);
		const { stdout } = await run(connection, args);
		return stdout;
	}
	if (!isAbsolute(source)) throw new MarkitdownError(`dsh-markitdown: path must be absolute, got "${source}"`);
	if (connection.allowedRoot !== void 0) await assertInsideRoot(connection.allowedRoot, source, "source");
	const extension = source.split(".").pop()?.toLowerCase() ?? "";
	if (!hasFormatHint && !SUPPORTED_BY_EXT.has(extension)) throw new MarkitdownError(`dsh-markitdown: ".${extension}" is not a MarkItDown input. Supported: ${supportedExtensions().map((ext) => `.${ext}`).join(", ")}. Pass an extensionHint for unlisted formats.`);
	let size;
	try {
		size = (await stat(source)).size;
	} catch {
		throw new MarkitdownError(`dsh-markitdown: cannot read "${source}" (file missing or not readable)`);
	}
	if (size > connection.maxInputBytes) throw new MarkitdownError(`dsh-markitdown: "${source}" is ${size} bytes, above the ${connection.maxInputBytes} byte limit`);
	const args = ["-m", "markitdown"];
	appendHintFlags(args, hints, connection);
	args.push(source);
	const { stdout } = await run(connection, args);
	return stdout;
}
/**
* Convert one source with LLM assistance (image descriptions instead of raw
* data URIs) through the bundled helper. Requires the `openai` package and
* the API key environment variable configured on the plugin. URL sources are
* refused unless llmAllowUrls is set — internal content must never leave the
* host through the LLM API by accident.
*/
async function convertWithLlm(connection, spec) {
	if (connection.llmModel === void 0 || connection.llmModel === "") throw new MarkitdownError("dsh-markitdown: LLM-assisted conversion needs the llmModel config field");
	if (spec.stdinBase64 !== void 0) throw new MarkitdownError("dsh-markitdown: LLM-assisted conversion does not support stdinBase64");
	const source = spec.source;
	if (source === void 0) throw new MarkitdownError("dsh-markitdown: nothing to convert — pass source");
	if (isUrl(source)) {
		if (!connection.llmAllowUrls) throw new MarkitdownError("dsh-markitdown: URL sources are disabled in LLM mode (internal content would leave the host); set llmAllowUrls to permit them");
		await assertUrlEgress(connection, source);
	} else {
		if (!isAbsolute(source)) throw new MarkitdownError(`dsh-markitdown: path must be absolute, got "${source}"`);
		if (connection.allowedRoot !== void 0) await assertInsideRoot(connection.allowedRoot, source, "source");
		try {
			const size = (await stat(source)).size;
			if (size > connection.maxInputBytes) throw new MarkitdownError(`dsh-markitdown: "${source}" is ${size} bytes, above the ${connection.maxInputBytes} byte limit`);
		} catch (error) {
			if (error instanceof MarkitdownError) throw error;
			throw new MarkitdownError(`dsh-markitdown: cannot read "${source}" (file missing or not readable)`);
		}
	}
	const apiKey = process.env[connection.llmApiKeyEnv]?.trim();
	if (apiKey === void 0 || apiKey === "") throw new MarkitdownError(`dsh-markitdown: environment variable ${connection.llmApiKeyEnv} is not set. Export it (or pick another name via llmApiKeyEnv) to enable LLM-assisted conversion.`);
	const args = [
		llmHelperPath(),
		connection.llmModel,
		connection.llmApiKeyEnv,
		source
	];
	if ((spec.hints?.extensionHint ?? "") !== "") args.push("--extension", sanitizeHintedExtension(spec.hints?.extensionHint));
	const { stdout } = await run(connection, args);
	return stdout;
}
/**
* Convert sources one at a time (the converter process is the bottleneck, so
* no parallelism). Per-source failures are captured on the result instead of
* aborting the batch.
*/
async function convertBatch(connection, specs) {
	const results = [];
	for (const spec of specs) {
		const source = spec.stdinBase64 !== void 0 ? "(stdin)" : spec.source ?? "(unknown)";
		try {
			const markdown = connection.llmModel !== void 0 ? await convertWithLlm(connection, spec) : await convertOne(connection, spec);
			results.push({
				source,
				markdown
			});
		} catch (error) {
			results.push({
				source,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	return results;
}
/** Probe the environment and report whether conversions are ready. */
async function checkEnvironment(connection) {
	try {
		const version = (await run(connection, ["-c", "import importlib.metadata as m; print(m.version(\"markitdown\"))"])).stdout.trim();
		let detail = `markitdown ${version} is available under "${connection.command}".`;
		if (connection.llmModel !== void 0) try {
			await run(connection, ["-c", "import openai"]);
			detail += ` LLM-assisted conversion is configured (model ${connection.llmModel}, API key from ${connection.llmApiKeyEnv}).`;
		} catch {
			detail += ` LLM-assisted conversion is configured (model ${connection.llmModel}) but the openai package is missing — run: ${connection.command} -m pip install openai`;
		}
		return {
			command: connection.command,
			ready: true,
			version,
			detail
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
* Resolve `target` with symlinks followed as far as the path exists; the
* non-existent tail is kept verbatim under the nearest existing ancestor and
* lexically normalized, so `..` segments collapse the way the OS will resolve
* them once ancestors are created.
*/
async function realpathBestEffort(target) {
	const parts = target.split(sep).filter((part) => part.length > 0);
	const prefix = target.startsWith(sep) ? sep : "";
	for (let depth = parts.length; depth >= 1; depth -= 1) {
		const head = prefix + parts.slice(0, depth).join(sep);
		try {
			const resolved = await realpath(head);
			return depth === parts.length ? resolved : normalize(join(resolved, parts.slice(depth).join(sep)));
		} catch {}
	}
	return normalize(target);
}
/** Normalize a resolved path for containment comparison. Backslashes are
* translated to separators only on Windows, where they are separators; on
* POSIX they are ordinary filename bytes and must stay untouched. */
function normalizeForCompare(path) {
	if (process.platform === "win32") return path.replace(/\\/gu, "/").toLowerCase();
	return path;
}
/**
* Ensure `target` resolves (after following symlinks) inside `root`.
* Works for existing and not-yet-existing paths; used for both read sources
* and output destinations.
* @param root - Containment root (absolute).
* @param target - Path to check (absolute).
* @param role - 'source' or 'output', used in the error message.
*/
async function assertInsideRoot(root, target, role) {
	if (!isAbsolute(root)) throw new MarkitdownError(`dsh-markitdown: allowedRoot must be absolute, got "${root}"`);
	if (!isAbsolute(target)) throw new MarkitdownError(`dsh-markitdown: ${role} path must be absolute, got "${target}"`);
	const [rootReal, targetReal] = await Promise.all([realpath(root), realpathBestEffort(target)]);
	const rootNorm = normalizeForCompare(rootReal).replace(/\/+$/u, "");
	const targetNorm = normalizeForCompare(targetReal);
	if (targetNorm !== rootNorm && !targetNorm.startsWith(rootNorm + "/")) throw new MarkitdownError(`dsh-markitdown: ${role} path "${target}" resolves to "${targetReal}", outside allowedRoot "${rootReal}"`);
}
export { MarkitdownError, SUPPORTED_FORMATS, assertInsideRoot, assertUrlEgress, checkEnvironment, convertBatch, convertOne, convertWithLlm, isUrl, llmHelperPath, sanitizeHintedExtension, setupGuidance, supportedExtensions };
