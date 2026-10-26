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
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  assertInsideRoot,
  checkEnvironment,
  convertBatch,
  convertOne,
  convertWithLlm,
  MarkitdownError,
  SUPPORTED_FORMATS,
  type Connection,
  type ConvertHints,
  type ConvertSpec,
} from './runner.js'

/** Maximum sources in one batch call. */
const MAX_BATCH = 16

/** Convert tool arguments. */
interface ConvertArgs {
  readonly path?: string
  readonly paths?: readonly string[]
  readonly stdinBase64?: string
  readonly extensionHint?: string
  readonly mimeHint?: string
  readonly charsetHint?: string
  readonly keepDataUris?: boolean
  readonly output?: string
  readonly outputDir?: string
}

function hintsOf(args: ConvertArgs): ConvertHints | undefined {
  const hints: ConvertHints = {
    ...args.extensionHint === undefined || args.extensionHint === '' ? {} : { extensionHint: args.extensionHint },
    ...args.mimeHint === undefined || args.mimeHint === '' ? {} : { mimeHint: args.mimeHint },
    ...args.charsetHint === undefined || args.charsetHint === '' ? {} : { charsetHint: args.charsetHint },
    ...args.keepDataUris === true ? { keepDataUris: true } : {},
  }
  return Object.keys(hints).length === 0 ? undefined : hints
}

/** Resolve the output file path for one source under output/outputDir rules. */
async function resolveOutputPath(connection: Connection, args: ConvertArgs, source: string, batch: boolean): Promise<string | undefined> {
  if (!batch && args.output !== undefined && args.output !== '') {
    if (!isAbsolute(args.output)) throw new MarkitdownError(`dsh-markitdown: output path must be absolute, got "${args.output}"`)
    if (connection.allowedRoot !== undefined) await assertInsideRoot(connection.allowedRoot, args.output, 'output')
    return args.output
  }
  if (args.outputDir !== undefined && args.outputDir !== '') {
    if (!isAbsolute(args.outputDir)) throw new MarkitdownError(`dsh-markitdown: outputDir must be absolute, got "${args.outputDir}"`)
    const leaf = source === '(stdin)' ? 'stdin' : basename(source).replace(/\.[^.]+$/u, '') || 'output'
    const target = join(args.outputDir, `${leaf}.md`)
    if (connection.allowedRoot !== undefined) await assertInsideRoot(connection.allowedRoot, target, 'output')
    return target
  }
  return undefined
}

/** Register the two conversion tools. */
export function registerTools(ctx: Context, connection: Connection): void {
  const formatList = SUPPORTED_FORMATS.map(format => `.${format.extension} (${format.extracts})`).join('; ')
  // The active provider can change under Settings → MarkItDown while this
  // tool stays registered, so the description names the behavior rather than
  // the current model; markitdown_check reports the live selection.
  const llmNote = 'When an LLM provider is active in Settings → MarkItDown, embedded images are described by that model instead of emitted as data URIs.'

  ctx.tools.register(defineTool({
    name: 'markitdown_check',
    description: [
      'Check whether the MarkItDown Python package is available to this plugin.',
      'Use first before any markitdown_convert call; the result reports the installed version',
      'or the exact setup command when MarkItDown is missing.',
    ].join(' '),
    parameters: {},
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ready: { type: 'boolean', required: true, description: 'True when conversions can run.' },
          detail: { type: 'string', required: true, description: 'Installed version or setup guidance.' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.ready ? `MarkItDown ready: ${value.detail}` : `MarkItDown not ready: ${value.detail}` }],
    },
    execute: async () => {
      const result = await checkEnvironment(connection)
      return { ready: result.ready, detail: result.detail }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'markitdown_convert',
    description: [
      'Convert one source — a local file path, an http(s) URL (e.g. a YouTube link), or stdin bytes — to Markdown with Microsoft MarkItDown.',
      `Supported local inputs: ${formatList}.`,
      'Use `paths` for a batch (up to ' + String(MAX_BATCH) + '); per-file failures do not abort the batch.',
      'Pass output to write the single-source result to a file, or outputDir to write <name>.md per source; otherwise Markdown comes back inline.',
      'stdinBase64 needs an extensionHint or mimeHint so MarkItDown can pick a converter.',
      'Hints map to the MarkItDown CLI: extensionHint (-x), mimeHint (-m), charsetHint (-c), keepDataUris.',
      'Third-party converter plugins (CLI -p) run only when the plugin admin enables allowPlugins in the config.',
      llmNote,
      'Run markitdown_check first if the environment has not been verified this session.',
    ].join(' '),
    parameters: {
      path: { type: 'string', description: 'Absolute local file path or http(s) URL of one source.' },
      paths: { type: 'array', items: { type: 'string' }, description: 'Batch of absolute local paths or http(s) URLs (max ' + String(MAX_BATCH) + '); combines with path.' },
      stdinBase64: { type: 'string', description: 'Canonical base64 bytes fed to MarkItDown stdin; requires extensionHint or mimeHint.' },
      extensionHint: { type: 'string', description: 'CLI -x: extension hint; also admits local files whose extension is not in the built-in list.' },
      mimeHint: { type: 'string', description: 'CLI -m: MIME-type hint.' },
      charsetHint: { type: 'string', description: 'CLI -c: charset hint, e.g. UTF-8.' },
      keepDataUris: { type: 'boolean', description: 'CLI --keep-data-uris: keep base64 image payloads instead of truncating.' },
      output: { type: 'string', description: 'Absolute output .md path; single-source only.' },
      outputDir: { type: 'string', description: 'Absolute directory; writes <source-name>.md per converted source.' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          path: { type: 'string', description: 'The single source that was converted.' },
          markdown: { type: 'string', description: 'Converted Markdown for the single source (present unless an output path was used).' },
          output: { type: 'string', description: 'The file the single-source Markdown was written to.' },
          results: {
            type: 'array',
            description: 'Per-source outcomes when a batch (or stdin) was converted.',
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                source: { type: 'string', required: true },
                markdown: { type: 'string' },
                output: { type: 'string' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.output !== undefined
          ? `Converted ${value.path} → ${value.output}`
          : value.results !== undefined
            ? `Converted ${value.results.length} source(s): ${value.results.map(r => r.error !== undefined ? `${r.source} (failed)` : r.output ?? r.source).join(', ')}`
            : `Converted ${value.path} (${value.markdown?.length ?? 0} chars of Markdown)`,
      }],
    },
    execute: async (args: ConvertArgs) => {
      const sources: string[] = [
        ...args.path !== undefined && args.path !== '' ? [args.path] : [],
        ...(args.paths ?? []).filter(source => source !== ''),
      ]
      const useStdin = args.stdinBase64 !== undefined && args.stdinBase64 !== ''
      if (!useStdin && sources.length === 0) throw new MarkitdownError('dsh-markitdown: pass path, paths, or stdinBase64')
      if (useStdin && sources.length > 0) throw new MarkitdownError('dsh-markitdown: stdinBase64 cannot combine with path/paths')
      if (sources.length > MAX_BATCH) throw new MarkitdownError(`dsh-markitdown: at most ${MAX_BATCH} sources per batch, got ${sources.length}`)
      if (!useStdin && args.output !== undefined && args.output !== '' && sources.length !== 1) {
        throw new MarkitdownError('dsh-markitdown: output applies to a single source; use outputDir for batches')
      }
      const hints = hintsOf(args)
      const specs: ConvertSpec[] = useStdin
        ? [{ stdinBase64: args.stdinBase64 as string, hints }]
        : sources.map(source => ({ source, hints }))
      const convert = connection.llmModel !== undefined ? convertWithLlm : convertOne

      if (sources.length <= 1) {
        const spec = specs[0] as ConvertSpec
        const source = useStdin ? '(stdin)' : (spec.source as string)
        const markdown = await convert(connection, spec)
        const outputPath = await resolveOutputPath(connection, args, source, false)
        if (outputPath !== undefined) {
          await mkdir(dirname(outputPath), { recursive: true })
          await writeFile(outputPath, markdown, 'utf8')
          return useStdin ? { results: [{ source, output: outputPath }] } : { path: source, output: outputPath }
        }
        return useStdin ? { results: [{ source, markdown }] } : { path: source, markdown }
      }

      const converted = await convertBatch(connection, specs)
      if (args.outputDir === undefined || args.outputDir === '') return { results: converted }
      const results = []
      for (const result of converted) {
        if (result.markdown === undefined) {
          results.push(result)
          continue
        }
        const outputPath = await resolveOutputPath(connection, args, result.source, true)
        if (outputPath === undefined) {
          results.push(result)
          continue
        }
        await mkdir(dirname(outputPath), { recursive: true })
        await writeFile(outputPath, result.markdown, 'utf8')
        results.push({ source: result.source, output: outputPath })
      }
      return { results }
    },
  }))
}
