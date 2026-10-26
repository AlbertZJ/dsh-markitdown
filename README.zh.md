# dsh-markitdown

[English](README.md) | 面向 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/DeepSeek-Harness) 的 Microsoft MarkItDown 集成插件。

通过模型侧工具把 PDF、Office、HTML、图片、音频等文件转成 Markdown——
不走 MCP、不内置二进制。插件驱动你指定的 Python 解释器运行
[`markitdown`](https://github.com/microsoft/markitdown) 包
（`python -m markitdown`）。

## 提供的能力

- **`markitdown_check`**：探测所配置的解释器，返回已装的 MarkItDown
  版本（配置了 LLM 模式时一并报告 helper 就绪状态）；未安装时给出精确的
  setup 命令。
- **`markitdown_convert`**：把单个来源或批量来源转成 Markdown：
  - `path`：单个绝对本地路径**或 http(s) URL**（如 YouTube 链接，需已装
    `[all]` extra）；
  - `paths`：最多 16 个路径/URL 的批量，单个失败不影响其他来源；
  - `stdinBase64`：以 canonical base64 字节走 MarkItDown stdin（必须给
    `extensionHint`/`mimeHint`）；
  - 提示参数对应 CLI：`extensionHint`（-x，也可放行进白名单外的本地扩展名）、
    `mimeHint`（-m）、`charsetHint`（-c）、`keepDataUris`、
    `usePlugins`（第三方 MarkItDown converter 插件）；
  - `output` 把单来源结果写文件，`outputDir` 按来源写 `<名称>.md`；
    默认内联返回 Markdown。
- **LLM 辅助转换**（配置 `llmModel`）：Office 文档内嵌图片由
  OpenAI 兼容的 LLM 生成描述文字，而不是输出 data URI。内置
  `python/llm_convert.py` helper；需要 `openai` 包与
  `llmApiKeyEnv`（默认 `OPENAI_API_KEY`）环境变量里的 API key。
- **`markitdown` 技能**：打包工作流（环境检查 → 转换 → 汇报注意事项），
  含各格式预期与已知限制。

支持的输入：PDF、DOCX/DOC、PPTX/PPT、XLSX/XLS、CSV、JSON、XML、
HTML/HTM、EPUB、MD、Outlook MSG、ZIP（内含文件逐个转换）、
JPG/JPEG/PNG/GIF/TIFF/BMP（EXIF 元数据，可用时 OCR）、
WAV/MP3（语音转写，需要 `[all]` extra）。

## 安装

前置：某个 Python 环境里已安装 MarkItDown：

```sh
python -m pip install 'markitdown[all]'
```

从 Git 仓库安装插件到 dsh（任一 profile 的插件页"从源码安装"，或等价
CLI 命令）：

```
github:AlbertZJ/dsh-markitdown
```

## 配置

全部可选；当 PATH 上的 `python` 已装好包时默认值即可用。

```yaml
- name: 'dsh-markitdown'
  config:
    # 运行 `-m markitdown` 的 Python 解释器。Windows 上只有 py 启动器时
    # 填 py 或绝对路径，例如
    # C:/Users/you/AppData/Local/Programs/Python/Python312/python.exe
    command: python
    timeoutMs: 60000        # 单次转换超时
    maxInputBytes: 52428800 # 源文件 50 MiB 上限
    maxOutputBytes: 8388608 # 捕获输出 8 MiB 上限（超出即杀进程）
    # 可选：把所有读写限制在一个工作区内。路径会跟随符号链接解析，
    # 必须落在该根目录之下。
    # allowedRoot: D:/work/documents
    # 可选：LLM 辅助转换（内嵌图片由 LLM 描述）。需要 `pip install openai`
    # 并在环境变量里导出 key。
    # llmModel: gpt-4o
    # llmApiKeyEnv: OPENAI_API_KEY
```

## 验证

```sh
pnpm install
pnpm run build
pnpm run verify   # 结构校验（包、patch、技能、lib、locale）
```

`verify.mjs` 无第三方依赖，每次 push 也会在 CI 里跑。

## 说明与限制

- 转换以 dsh 宿主子进程方式运行，不经过 Bash 审批流；插件在调用
  MarkItDown 前会校验路径（绝对路径、存在、扩展名白名单、大小上限）。
- 无文本层的扫描版 PDF 转换结果会很少或为空。
- 复杂排版会被压平成线性 Markdown；DOCX 内嵌图片以 data URI 返回且
  可能很大——这类请用 `output` 写文件。
- 本插件不会自行安装 Python 包；跑 `markitdown_check` 按其指引安装。

## 许可

[MIT](LICENSE)。MarkItDown 本身为 Microsoft 的 MIT 许可项目，**未被打包
进本插件**——请按上面的方式装进你的 Python 环境。
