/** Locale bundles for the MarkItDown settings tab. */

/** Locale keys the tab renders. */
export type MarkitdownSettingsLocaleKey =
  | 'tab'
  | 'title' | 'description'
  | 'llmOffNote'
  | 'providerLabel' | 'providerOpenai' | 'providerDeepseek' | 'providerCustom'
  | 'baseUrlLabel' | 'baseUrlPlaceholder' | 'baseUrlHint'
  | 'modelLabel' | 'modelPlaceholder' | 'modelHint'
  | 'keyRefLabel' | 'keyRefHint'
  | 'keyLabel' | 'keyPlaceholder' | 'keyConfigured' | 'keyNotConfigured' | 'keyChecking'
  | 'keySave' | 'keyClear' | 'keySaved' | 'keyCleared' | 'keyFailed' | 'keyInvalid'
  | 'saved' | 'failed'
  | 'readOnly' | 'unavailable'

/** English copy. */
export const en: Record<MarkitdownSettingsLocaleKey, string> = {
  tab: 'MarkItDown',
  title: 'MarkItDown LLM provider',
  description: 'LLM-assisted conversion describes embedded images in Office documents instead of emitting raw data URIs. Pick a provider, enter a model, and store the API key — the key is kept in the dsh credential store, never in the profile configuration.',
  llmOffNote: 'LLM mode is off until a model name is saved.',
  providerLabel: 'Provider',
  providerOpenai: 'OpenAI',
  providerDeepseek: 'DeepSeek',
  providerCustom: 'Custom endpoint',
  baseUrlLabel: 'Endpoint (base URL)',
  baseUrlPlaceholder: 'https://api.example.com/v1',
  baseUrlHint: 'OpenAI-compatible endpoint; leave empty for the provider default.',
  modelLabel: 'Model',
  modelPlaceholder: 'e.g. gpt-4o',
  modelHint: 'Saving a model name switches conversions to LLM mode.',
  keyRefLabel: 'Key reference',
  keyRefHint: 'Name the credential is stored under; default OPENAI_API_KEY. Changing it means the key must be stored again.',
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
  saved: 'Saved.',
  failed: 'The deployment did not accept the change.',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'The MarkItDown plugin is not loaded right now.',
}

/** Simplified Chinese copy. */
export const zh: Record<MarkitdownSettingsLocaleKey, string> = {
  tab: 'MarkItDown',
  title: 'MarkItDown LLM 提供商',
  description: 'LLM 辅助转换会把 Office 文档中的内嵌图片描述成文字，而不是输出原始 data URI。选择一个提供商、填写模型名并保存 API 密钥——密钥存放在 dsh 凭证存储中，不会写进配置文件。',
  llmOffNote: '保存模型名后才会开启 LLM 模式。',
  providerLabel: '提供商',
  providerOpenai: 'OpenAI',
  providerDeepseek: 'DeepSeek',
  providerCustom: '自定义端点',
  baseUrlLabel: '端点（base URL）',
  baseUrlPlaceholder: 'https://api.example.com/v1',
  baseUrlHint: 'OpenAI 兼容端点；留空则使用提供商默认地址。',
  modelLabel: '模型',
  modelPlaceholder: '例如 gpt-4o',
  modelHint: '保存模型名后，转换即切换为 LLM 模式。',
  keyRefLabel: '密钥引用名',
  keyRefHint: '密钥存入凭证存储时使用的名字，默认 OPENAI_API_KEY；修改后需要重新保存密钥。',
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
  saved: '已保存。',
  failed: '部署未接受该修改。',
  readOnly: '本部署的设置为只读。',
  unavailable: 'MarkItDown 插件当前未加载。',
}
