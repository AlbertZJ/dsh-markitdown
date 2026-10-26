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
    `mimeHint`（-m）、`charsetHint`（-c）、`keepDataUris`；
  - URL 来源经连接级钉扎出口校验后下载字节再转换（校验的地址即连接的
    地址，无 DNS rebinding 间隙；loopback/私网/链路本地目标默认拒绝，
    除非 `allowPrivateUrls`）；
  - `output` 把单来源结果写文件，`outputDir` 按来源写 `<名称>.md`；
    默认内联返回 Markdown。
- **DOCX 图片导出**：Word 内嵌图片会导出成文件，data URI 占位符替换为文件
  链接，会话可以直接打开原图（`read_image`）并追问，而不是依赖一次性描述。
  指定 `output` 时图片写入同级的 `<名称>.media/` 并用相对路径引用；指定
  `outputDir` 时每个 `<名称>.media/` 与对应 Markdown 并排；内联转换则导出到
  临时目录并用绝对路径引用。全程不涉及模型或 API 密钥。
- **可选图片描述**：在独立的 **设置 → MarkItDown** 页面（不在插件清单里）
  有一个开关，开启后由模型为每张导出图片额外写描述；同一页面每个提供商一张
  卡片——OpenAI、DeepSeek 或自定义端点——各自保存模型和 API 密钥，当前启用
  的卡片决定转换用哪一组。密钥存入 dsh 凭证存储而非配置文件；各提供商的
  `apiKeyEnv` 引用与环境变量仍作为兜底。内置 `python/llm_convert.py` helper，
  只有开启描述时才需要 `openai` 包。
  DOCX 单独处理：markitdown 0.1.x 的 Word 转换器从不把内嵌图片交给 LLM，
  所以 helper 会按文档顺序解包 `word/media`、导出（以及按需描述）每张图，
  并原位替换 data URI 占位符。描述使用 `temperature=0`，要求逐字转录、
  看不清标 `[unreadable]`、发送者不确定时明说而不猜，并标注原图成员名以便
  核对。
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
    # 可选：LLM 辅助转换（内嵌图片由 LLM 描述）。需要 `pip install openai`。
    # 提供商与密钥在「设置 → MarkItDown」页面配置；下面就是它写入的配置：
    # 当前启用的提供商 + 每个提供商一组 profile。
    # llmProvider: deepseek
    # llmProviders:
    #   openai:   { baseUrl: https://api.openai.com/v1, model: gpt-4o, apiKeyEnv: OPENAI_API_KEY }
    #   deepseek: { baseUrl: https://api.deepseek.com/v1, model: deepseek-chat, apiKeyEnv: DEEPSEEK_API_KEY }
    #   custom:   { baseUrl: https://api.example.com/v1, model: my-model, apiKeyEnv: MARKITDOWN_API_KEY }
    # 旧的单提供商字段，仅在 llmProvider 未设置时生效：
    # llmModel: gpt-4o
    # llmBaseUrl: https://api.deepseek.com/v1
    # llmApiKeyEnv: OPENAI_API_KEY
    # 是否让当前模型描述每张导出的 DOCX 图片（默认关闭；无论开关如何，
    # 图片都会导出并链接）。可在「设置 → MarkItDown」页面切换。
    # describeImages: false
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
- 复杂排版会被压平成线性 Markdown。DOCX 内嵌图片会导出为文件（Markdown
  旁的 `<名称>.media/`）并以路径引用；内联转换导出到临时目录，可能被系统
  清理——需要长期保留时请用 `output`/`outputDir`。设置了 `allowedRoot`
  时，内联转换不会在工作区外写文件，而是保留 data URI。
- 图片描述是一次性结果：措辞精确要求高时，应打开导出的原图
  （`read_image`）而不是依赖描述。
- 本插件不会自行安装 Python 包；跑 `markitdown_check` 按其指引安装。

## 许可

[MIT](LICENSE)。MarkItDown 本身为 Microsoft 的 MIT 许可项目，**未被打包
进本插件**——请按上面的方式装进你的 Python 环境。
