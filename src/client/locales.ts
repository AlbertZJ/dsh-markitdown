/** Locale bundles for the MarkItDown settings page. */

/** Locale keys the section renders. */
export type MarkitdownSettingsLocaleKey =
  | 'nav'
  | 'title' | 'description'
  | 'llmOffNote'
  | 'providerOpenai' | 'providerDeepseek' | 'providerCustom'
  | 'activeBadge' | 'activate' | 'deactivate'
  | 'baseUrlLabel' | 'baseUrlPlaceholder' | 'baseUrlHint'
  | 'modelLabel' | 'modelPlaceholder' | 'modelHint'
  | 'keyLabel' | 'keyPlaceholder' | 'keyConfigured' | 'keyNotConfigured' | 'keyChecking'
  | 'keySave' | 'keyClear' | 'keySaved' | 'keyCleared' | 'keyFailed' | 'keyInvalid'
  | 'keyRefHint'
  | 'saved' | 'failed' | 'activated' | 'activateFailed' | 'deactivated'
  | 'readOnly' | 'unavailable'

/** English copy. */
export const en: Record<MarkitdownSettingsLocaleKey, string> = {
  nav: 'MarkItDown',
  title: 'MarkItDown LLM providers',
  description: 'LLM-assisted conversion describes embedded images in Office documents instead of emitting raw data URIs. Each provider keeps its own model and API key; the active provider is the one conversions use. Keys are kept in the dsh credential store, never in the profile configuration.',
  llmOffNote: 'No provider is active: conversions run without LLM assistance until you activate one that has a model.',
  providerOpenai: 'OpenAI',
  providerDeepseek: 'DeepSeek',
  providerCustom: 'Custom endpoint',
  activeBadge: 'In use',
  activate: 'Use this provider',
  deactivate: 'Turn off LLM mode',
  baseUrlLabel: 'Endpoint (base URL)',
  baseUrlPlaceholder: 'https://api.example.com/v1',
  baseUrlHint: 'OpenAI-compatible endpoint; leave empty for the provider default.',
  modelLabel: 'Model',
  modelPlaceholder: 'e.g. gpt-4o',
  modelHint: 'Saving a model name switches this provider to LLM mode; clearing it turns LLM mode off for it.',
  keyLabel: 'API key',
  keyPlaceholder: 'Paste the API key',
  keyConfigured: 'A key is stored.',
  keyNotConfigured: 'No key stored yet.',
  keyChecking: 'Checking key…',
  keySave: 'Save key',
  keyClear: 'Clear',
  keySaved: 'API key stored.',
  keyCleared: 'Stored API key removed.',
  keyFailed: 'The credential store refused the key.',
  keyInvalid: 'Enter a non-empty key.',
  keyRefHint: 'Stored under the credential reference {ref}.',
  saved: 'Saved.',
  failed: 'The deployment did not accept the change.',
  activated: 'This provider is now in use.',
  activateFailed: 'The deployment did not accept the switch.',
  deactivated: 'LLM mode is off.',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'The MarkItDown plugin is not loaded right now.',
}

/** Simplified Chinese copy. */
export const zh: Record<MarkitdownSettingsLocaleKey, string> = {
  nav: 'MarkItDown',
  title: 'MarkItDown LLM 提供商',
  description: 'LLM 辅助转换会把 Office 文档中的内嵌图片描述成文字，而不是输出原始 data URI。每个提供商各自保存模型和 API 密钥；转换使用当前启用的那一个。密钥存放在 dsh 凭证存储中，不会写进配置文件。',
  llmOffNote: '当前没有启用的提供商：在启用一个已填模型的提供商之前，转换不会使用 LLM。',
  providerOpenai: 'OpenAI',
  providerDeepseek: 'DeepSeek',
  providerCustom: '自定义端点',
  activeBadge: '使用中',
  activate: '使用此提供商',
  deactivate: '关闭 LLM 模式',
  baseUrlLabel: '端点（base URL）',
  baseUrlPlaceholder: 'https://api.example.com/v1',
  baseUrlHint: 'OpenAI 兼容端点；留空则使用提供商默认地址。',
  modelLabel: '模型',
  modelPlaceholder: '例如 gpt-4o',
  modelHint: '保存模型名会为该提供商开启 LLM 模式；清空则对该提供商关闭。',
  keyLabel: 'API 密钥',
  keyPlaceholder: '粘贴 API 密钥',
  keyConfigured: '已存储密钥。',
  keyNotConfigured: '尚未存储密钥。',
  keyChecking: '正在检查密钥…',
  keySave: '保存密钥',
  keyClear: '清除',
  keySaved: 'API 密钥已存储。',
  keyCleared: '已移除存储的 API 密钥。',
  keyFailed: '凭证存储拒绝了该密钥。',
  keyInvalid: '请输入非空密钥。',
  keyRefHint: '保存在凭证引用 {ref} 下。',
  saved: '已保存。',
  failed: '部署未接受该修改。',
  activated: '已切换到该提供商。',
  activateFailed: '部署未接受此次切换。',
  deactivated: '已关闭 LLM 模式。',
  readOnly: '本部署的设置为只读。',
  unavailable: 'MarkItDown 插件当前未加载。',
}
