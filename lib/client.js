window.__ModuleLoader__.load({
	id: "dsh-markitdown",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/client/MarkitdownSettingsSection.tsx
		/**
		* The MarkItDown settings page: one card per provider (OpenAI, DeepSeek,
		* custom endpoint), each with its own model, endpoint and API key. Exactly
		* one provider is active; its profile alone drives conversions. Keys are
		* write-only — they go to the credential store and never render back.
		*/
		/** Render the per-provider form, as the settings shell asks. */
		function MarkitdownSettingsSection(props) {
			const { t, saveProviderField, activateProvider, deactivateProvider, setDescribeImages, saveKey, clearKey } = props;
			const state = props.useMarkitdownSettings((snapshot) => snapshot);
			const [keyInputs, setKeyInputs] = (0, react.useState)({});
			if (state.status === "unavailable") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: css.note,
				children: t("unavailable")
			});
			const disabled = !state.writable || state.busy;
			const describeNotice = noticeWithoutProvider(state.notice);
			const setKeyInput = (provider, value) => {
				setKeyInputs((draft) => ({
					...draft,
					[provider]: value
				}));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: css.column,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: css.description,
						children: t("description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: css.field,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: css.toggleRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: state.describeImages,
									disabled,
									onChange: (event) => {
										setDescribeImages(event.currentTarget.checked);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: css.label,
									children: t("describeLabel")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: css.hint,
								children: t("describeHint")
							}),
							describeNotice !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: css.note,
								role: "status",
								children: noticeText(t, describeNotice)
							}) : null
						]
					}),
					!state.active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: css.note,
						children: t("llmOffNote")
					}) : null,
					state.providers.map((provider) => {
						const keyInput = keyInputs[provider.id] ?? "";
						const notice = noticeFor(state.notice, provider.id);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							style: provider.active ? {
								...css.card,
								...css.cardActive
							} : css.card,
							"aria-label": providerLabel(t, provider.id),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									style: css.cardHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: css.cardTitle,
										children: providerLabel(t, provider.id)
									}), provider.active ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: css.activeRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: css.badge,
											children: t("activeBadge")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: css.linkButton,
											disabled,
											onClick: () => {
												deactivateProvider();
											},
											children: t("deactivate")
										})]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: css.option,
										disabled,
										onClick: () => {
											activateProvider(provider.id);
										},
										children: t("activate")
									})]
								}),
								provider.id === "custom" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlurField, {
									label: t("baseUrlLabel"),
									hint: t("baseUrlHint"),
									placeholder: t("baseUrlPlaceholder"),
									value: provider.baseUrl,
									disabled,
									onSave: (value) => saveProviderField(provider.id, "baseUrl", value)
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: css.hint,
									children: provider.baseUrl
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlurField, {
									label: t("modelLabel"),
									hint: t("modelHint"),
									placeholder: t("modelPlaceholder"),
									value: provider.model,
									disabled,
									onSave: (value) => saveProviderField(provider.id, "model", value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: css.field,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: css.label,
											children: t("keyLabel")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: css.keyRow,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: "password",
													style: css.input,
													placeholder: t("keyPlaceholder"),
													value: keyInput,
													disabled,
													onChange: (event) => setKeyInput(provider.id, event.currentTarget.value)
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													style: css.primary,
													disabled: disabled || keyInput.trim() === "",
													onClick: () => {
														saveKey(provider.id, keyInput).then((ok) => {
															if (ok) setKeyInput(provider.id, "");
														});
													},
													children: t("keySave")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													style: css.option,
													disabled: disabled || provider.keyConfigured !== true,
													onClick: () => {
														clearKey(provider.id);
													},
													children: t("keyClear")
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: css.hint,
											children: [
												t("keyRefHint", { ref: provider.apiKeyEnv }),
												" · ",
												keyStateText(t, provider)
											]
										})
									]
								}),
								notice !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: css.note,
									role: "status",
									children: noticeText(t, notice)
								}) : null
							]
						}, provider.id);
					}),
					!state.writable && state.status === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: css.note,
						children: t("readOnly")
					}) : null
				]
			});
		}
		/** One text field that saves its (trimmed) contents on blur or Enter. */
		function BlurField(props) {
			const [draft, setDraft] = (0, react.useState)(void 0);
			const shown = draft ?? props.value;
			const commit = () => {
				if (draft !== void 0 && draft.trim() !== props.value) props.onSave(draft);
				setDraft(void 0);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: css.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: css.label,
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						style: css.input,
						placeholder: props.placeholder,
						value: shown,
						disabled: props.disabled,
						onChange: (event) => setDraft(event.currentTarget.value),
						onBlur: commit,
						onKeyDown: (event) => {
							if (event.key === "Enter") commit();
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: css.hint,
						children: props.hint
					})
				]
			});
		}
		/** Localized provider name. */
		function providerLabel(t, provider) {
			if (provider === "openai") return t("providerOpenai");
			if (provider === "deepseek") return t("providerDeepseek");
			return t("providerCustom");
		}
		/** Credential state of one provider's key. */
		function keyStateText(t, provider) {
			if (provider.keyConfigured === void 0) return t("keyChecking");
			return provider.keyConfigured ? t("keyConfigured") : t("keyNotConfigured");
		}
		/** The notice when it belongs to the given provider card. */
		function noticeFor(notice, provider) {
			return notice !== void 0 && "provider" in notice && notice.provider === provider ? notice : void 0;
		}
		/** The description-toggle notice (the variants that carry no provider). */
		function noticeWithoutProvider(notice) {
			return notice !== void 0 && !("provider" in notice) ? notice : void 0;
		}
		/** Localized text of one write outcome. */
		function noticeText(t, notice) {
			switch (notice.kind) {
				case "saved": return t("saved");
				case "failed": return t("failed");
				case "activated": return t("activated");
				case "activateFailed": return t("activateFailed");
				case "deactivated": return t("deactivated");
				case "keySaved": return t("keySaved");
				case "keyCleared": return t("keyCleared");
				case "keyFailed": return t("keyFailed");
				case "describeSaved": return t("describeSaved");
				case "describeFailed": return t("describeFailed");
			}
		}
		/** Inline styles: the standalone client bundle carries no CSS pipeline. */
		const css = {
			column: {
				display: "flex",
				flexDirection: "column",
				gap: 14,
				maxWidth: 620
			},
			description: {
				margin: 0,
				opacity: .75,
				lineHeight: 1.6
			},
			note: {
				margin: 0,
				opacity: .65
			},
			field: {
				display: "flex",
				flexDirection: "column",
				gap: 6
			},
			label: { fontWeight: 600 },
			hint: {
				fontSize: 12,
				opacity: .6
			},
			input: {
				padding: "6px 10px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				fontSize: 13
			},
			card: {
				display: "flex",
				flexDirection: "column",
				gap: 10,
				padding: "12px 14px",
				borderRadius: 8,
				border: "1px solid rgba(128,128,128,0.3)"
			},
			cardActive: {
				borderColor: "Highlight",
				outline: "1px solid Highlight"
			},
			cardHeader: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 8
			},
			cardTitle: { fontWeight: 600 },
			activeRow: {
				display: "flex",
				alignItems: "center",
				gap: 8
			},
			badge: {
				fontSize: 11,
				padding: "2px 8px",
				borderRadius: 999,
				border: "1px solid Highlight",
				color: "inherit"
			},
			option: {
				padding: "5px 10px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				cursor: "pointer"
			},
			linkButton: {
				padding: 0,
				border: "none",
				background: "transparent",
				color: "inherit",
				opacity: .7,
				cursor: "pointer",
				fontSize: 12,
				textDecoration: "underline"
			},
			primary: {
				padding: "6px 12px",
				borderRadius: 6,
				border: "none",
				cursor: "pointer"
			},
			keyRow: {
				display: "flex",
				gap: 8,
				alignItems: "center",
				flexWrap: "wrap"
			},
			toggleRow: {
				display: "flex",
				gap: 8,
				alignItems: "center",
				cursor: "pointer"
			}
		};
		// src/client/contract.ts
		/**
		* Shared contract of the MarkItDown settings page: the host entry namespace
		* it configures, the provider profiles it edits, and the state surface the
		* page renders.
		*/
		/** Host cordis entry id the plugin's bundle patch installs. */
		const ENTRY_ID = "markitdown";
		/** Provider presets the page offers; `custom` starts with an empty endpoint. */
		const LLM_PROVIDER_PRESETS = [
			{
				id: "openai",
				baseUrl: "https://api.openai.com/v1",
				apiKeyEnv: "OPENAI_API_KEY"
			},
			{
				id: "deepseek",
				baseUrl: "https://api.deepseek.com/v1",
				apiKeyEnv: "DEEPSEEK_API_KEY"
			},
			{
				id: "custom",
				baseUrl: "",
				apiKeyEnv: "MARKITDOWN_API_KEY"
			}
		];
		// src/client/store.ts
		/**
		* Create a store seeded with `initial`; `update` mutates a shallow copy so the
		* previous snapshot reference stays intact.
		*/
		function createSnapshotStore(initial) {
			let snapshot = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				update(recipe) {
					const draft = Array.isArray(snapshot) ? [...snapshot] : { ...snapshot };
					recipe(draft);
					snapshot = draft;
					for (const listener of listeners) listener();
				}
			};
		}
		// src/client/controller.ts
		/** Follows the entry namespace and performs the page's writes. */
		var MarkitdownSettingsController = class {
			ctx;
			store = createSnapshotStore({
				status: "loading",
				writable: false,
				providers: LLM_PROVIDER_PRESETS.map((preset) => ({
					id: preset.id,
					active: false,
					model: "",
					baseUrl: preset.baseUrl,
					apiKeyEnv: preset.apiKeyEnv,
					keyConfigured: void 0
				})),
				active: false,
				describeImages: false,
				busy: false,
				notice: void 0
			});
			form;
			unsubscribe;
			/** Key answers keyed by credential reference; undefined while checking. */
			keys = /* @__PURE__ */ new Map();
			/** Reference set the pending credentials read describes; a stale answer is dropped. */
			keyGeneration = 0;
			/**
			* @param ctx - the browser plugin context, whose `configForms` service binds
			* the entry namespace and whose `remote.credentials` answers for the keys.
			*/
			constructor(ctx) {
				this.ctx = ctx;
				this.form = ctx.configForms.get(ENTRY_ID);
				this.unsubscribe = this.form.subscribe(() => {
					this.derive();
				});
				this.derive();
			}
			/** Build the face the page's slot registration injects. */
			inject() {
				return {
					hooks: { markitdownSettings: this.store },
					saveProviderField: (provider, field, value) => this.saveProviderField(provider, field, value),
					activateProvider: (provider) => this.activateProvider(provider),
					deactivateProvider: () => this.deactivateProvider(),
					setDescribeImages: (enabled) => this.setDescribeImages(enabled),
					saveKey: (provider, value) => this.saveKey(provider, value),
					clearKey: (provider) => this.clearKey(provider)
				};
			}
			/** Re-read every provider's key after the host reports a change. */
			refreshKey() {
				this.readKeys();
			}
			/** Release namespace subscriptions. */
			dispose() {
				this.unsubscribe();
			}
			/** Save one profile field; an empty string clears it. */
			async saveProviderField(provider, field, value) {
				const snapshot = this.store.getSnapshot();
				if (!snapshot.writable || snapshot.busy) return;
				const current = snapshot.providers.find((candidate) => candidate.id === provider);
				if (current === void 0) return;
				const next = {
					baseUrl: current.baseUrl,
					model: current.model,
					apiKeyEnv: current.apiKeyEnv
				};
				next[field] = value.trim();
				const accepted = await this.write(provider, next, current.active);
				this.store.update((draft) => {
					draft.notice = {
						kind: accepted ? "saved" : "failed",
						provider,
						field
					};
				});
			}
			/** Make one provider active: every field of its profile is written, then `llmProvider`. */
			async activateProvider(provider) {
				const snapshot = this.store.getSnapshot();
				if (!snapshot.writable || snapshot.busy) return;
				const current = snapshot.providers.find((candidate) => candidate.id === provider);
				if (current === void 0 || current.active) return;
				const profile = {
					baseUrl: current.baseUrl,
					model: current.model,
					apiKeyEnv: current.apiKeyEnv
				};
				const accepted = await this.write(provider, profile, true);
				this.store.update((draft) => {
					draft.notice = {
						kind: accepted ? "activated" : "activateFailed",
						provider
					};
				});
			}
			/** Turn LLM mode off: drop the active profile marker and the legacy model name. */
			async deactivateProvider() {
				const snapshot = this.store.getSnapshot();
				if (!snapshot.writable || snapshot.busy) return;
				const active = snapshot.providers.find((candidate) => candidate.active);
				if (active === void 0) return;
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const accepted = await this.form.mutate([{
						op: "unset",
						path: ["llmProvider"]
					}, {
						op: "unset",
						path: ["llmModel"]
					}]);
					this.store.update((draft) => {
						draft.busy = false;
						draft.notice = {
							kind: accepted ? "deactivated" : "activateFailed",
							provider: active.id
						};
					});
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/**
			* Enable or disable descriptions. Off is the schema default, so disabling
			* removes the field instead of persisting `false`.
			*/
			async setDescribeImages(enabled) {
				const snapshot = this.store.getSnapshot();
				if (!snapshot.writable || snapshot.busy) return;
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const accepted = await this.form.mutate([enabled ? {
						op: "set",
						path: ["describeImages"],
						value: true
					} : {
						op: "unset",
						path: ["describeImages"]
					}]);
					this.store.update((draft) => {
						draft.busy = false;
						draft.notice = { kind: accepted ? "describeSaved" : "describeFailed" };
					});
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Write a complete profile, optionally making it active, in one mutation. */
			async write(provider, profile, activate) {
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				const ops = [];
				for (const [field, value] of Object.entries(profile)) ops.push(value === "" ? {
					op: "unset",
					path: [
						"llmProviders",
						provider,
						field
					]
				} : {
					op: "set",
					path: [
						"llmProviders",
						provider,
						field
					],
					value
				});
				if (activate) ops.push({
					op: "set",
					path: ["llmProvider"],
					value: provider
				});
				try {
					const accepted = await this.form.mutate(ops);
					this.store.update((draft) => {
						draft.busy = false;
					});
					return accepted;
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Store a provider's API key in the credential store; resolves whether it accepted. */
			async saveKey(provider, value) {
				const trimmed = value.trim();
				const current = this.store.getSnapshot().providers.find((candidate) => candidate.id === provider);
				if (trimmed === "" || current === void 0) {
					this.store.update((draft) => {
						draft.notice = {
							kind: "keyFailed",
							provider
						};
					});
					return false;
				}
				if (this.store.getSnapshot().busy) return false;
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const response = await this.ctx.remote.credentials.set(current.apiKeyEnv, trimmed);
					this.keys.set(current.apiKeyEnv, response.ok);
					this.store.update((draft) => {
						draft.busy = false;
						draft.providers = draft.providers.map((candidate) => candidate.id === provider ? {
							...candidate,
							keyConfigured: response.ok
						} : candidate);
						draft.notice = {
							kind: response.ok ? "keySaved" : "keyFailed",
							provider
						};
					});
					return response.ok;
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Remove a provider's stored API key; an absent key is a no-op on the host. */
			async clearKey(provider) {
				const current = this.store.getSnapshot().providers.find((candidate) => candidate.id === provider);
				if (current === void 0 || this.store.getSnapshot().busy) return;
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const response = await this.ctx.remote.credentials.unset(current.apiKeyEnv);
					if (response.ok) this.keys.set(current.apiKeyEnv, false);
					this.store.update((draft) => {
						draft.busy = false;
						draft.providers = draft.providers.map((candidate) => candidate.id === provider ? {
							...candidate,
							keyConfigured: response.ok ? false : candidate.keyConfigured
						} : candidate);
						draft.notice = {
							kind: response.ok ? "keyCleared" : "keyFailed",
							provider
						};
					});
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Ask the credentials domain which provider references currently hold a key. */
			async readKeys() {
				const refs = [...new Set(this.store.getSnapshot().providers.map((provider) => provider.apiKeyEnv))];
				const generation = ++this.keyGeneration;
				const response = await this.ctx.remote.credentials.describe(refs);
				if (!response.ok || generation !== this.keyGeneration) return;
				for (const ref of refs) this.keys.set(ref, response.value[ref]?.configured ?? false);
				this.publishKeys();
			}
			/** Fold the form snapshot into the page state. */
			derive() {
				const snapshot = this.form.getSnapshot();
				const value = snapshot.value;
				const explicitId = text(value?.llmProvider);
				const legacyModel = text(value?.llmModel);
				const legacyBaseUrl = text(value?.llmBaseUrl);
				const legacyKeyEnv = text(value?.llmApiKeyEnv);
				const legacyId = explicitId === "" && legacyModel !== "" ? legacyProviderOf(legacyBaseUrl) : void 0;
				const activeId = explicitId !== "" ? explicitId : legacyId;
				const rawProviders = isRecord(value?.llmProviders) ? value.llmProviders : {};
				const providers = LLM_PROVIDER_PRESETS.map((preset) => {
					const entry = rawProviders[preset.id];
					const stored = isRecord(entry) ? entry : {};
					const legacy = explicitId === "" && activeId === preset.id;
					const apiKeyEnv = text(stored.apiKeyEnv) || (legacy && legacyKeyEnv !== "" ? legacyKeyEnv : preset.apiKeyEnv);
					return {
						id: preset.id,
						active: activeId === preset.id,
						model: text(stored.model) || (legacy ? legacyModel : ""),
						baseUrl: text(stored.baseUrl) || (legacy && legacyBaseUrl !== "" ? legacyBaseUrl : preset.baseUrl),
						apiKeyEnv,
						keyConfigured: this.keys.get(apiKeyEnv)
					};
				});
				this.store.update((draft) => {
					draft.status = snapshot.status;
					draft.writable = snapshot.writable;
					draft.providers = providers;
					draft.active = activeId !== void 0;
					draft.describeImages = value?.describeImages === true;
				});
				this.readKeys();
			}
			/** Fold the key answers into the current provider list. */
			publishKeys() {
				this.store.update((draft) => {
					draft.providers = draft.providers.map((provider) => ({
						...provider,
						keyConfigured: this.keys.get(provider.apiKeyEnv)
					}));
				});
			}
		};
		/** Normalize a persisted string value. */
		function text(value) {
			return typeof value === "string" ? value.trim() : "";
		}
		/** Narrow a persisted JSON value to a plain object. */
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** Map a legacy endpoint onto the preset it names; an empty endpoint means OpenAI's default. */
		function legacyProviderOf(baseUrl) {
			const normalized = baseUrl.trim().replace(/\/+$/u, "");
			if (normalized === "") return "openai";
			const preset = LLM_PROVIDER_PRESETS.find((candidate) => candidate.id !== "custom" && candidate.baseUrl === normalized);
			return preset === void 0 ? "custom" : preset.id;
		}
		// src/client/locales.ts
		/** English copy. */
		const en = {
			nav: "MarkItDown",
			title: "MarkItDown LLM providers",
			description: "DOCX images are exported as files next to the Markdown, so the session can open the originals (read_image). Optionally the active provider also describes each image. Each provider keeps its own model and API key; the active provider is the one conversions use. Keys are kept in the dsh credential store, never in the profile configuration.",
			describeLabel: "Describe images with the active model",
			describeHint: "Off by default: images are only exported and linked by path. On: the model writes a description beside each link (one call per image, adds tokens and latency). Requires an active provider with a key.",
			describeSaved: "Image description setting saved.",
			describeFailed: "The deployment did not accept the setting.",
			llmOffNote: "No provider is active: images are exported without descriptions until you activate one that has a model.",
			providerOpenai: "OpenAI",
			providerDeepseek: "DeepSeek",
			providerCustom: "Custom endpoint",
			activeBadge: "In use",
			activate: "Use this provider",
			deactivate: "Turn off LLM mode",
			baseUrlLabel: "Endpoint (base URL)",
			baseUrlPlaceholder: "https://api.example.com/v1",
			baseUrlHint: "OpenAI-compatible endpoint; leave empty for the provider default.",
			modelLabel: "Model",
			modelPlaceholder: "e.g. gpt-4o",
			modelHint: "Saving a model name switches this provider to LLM mode; clearing it turns LLM mode off for it.",
			keyLabel: "API key",
			keyPlaceholder: "Paste the API key",
			keyConfigured: "A key is stored.",
			keyNotConfigured: "No key stored yet.",
			keyChecking: "Checking key…",
			keySave: "Save key",
			keyClear: "Clear",
			keySaved: "API key stored.",
			keyCleared: "Stored API key removed.",
			keyFailed: "The credential store refused the key.",
			keyInvalid: "Enter a non-empty key.",
			keyRefHint: "Stored under the credential reference {ref}.",
			saved: "Saved.",
			failed: "The deployment did not accept the change.",
			activated: "This provider is now in use.",
			activateFailed: "The deployment did not accept the switch.",
			deactivated: "LLM mode is off.",
			readOnly: "This deployment stores settings read-only.",
			unavailable: "The MarkItDown plugin is not loaded right now."
		};
		/** Simplified Chinese copy. */
		const zh = {
			nav: "MarkItDown",
			title: "MarkItDown LLM 提供商",
			description: "DOCX 内嵌图片会默认导出成文件放在 Markdown 旁边，会话可以直接打开原图（read_image）。也可以让当前启用的提供商额外描述每张图片。每个提供商各自保存模型和 API 密钥；转换使用当前启用的那一个。密钥存放在 dsh 凭证存储中，不会写进配置文件。",
			describeLabel: "用当前模型描述图片",
			describeHint: "默认关闭：只导出图片并以路径引用。开启后：模型会在每张图旁写一段描述（每张图一次调用，增加 token 与延迟）。需要先启用一个已保存密钥的提供商。",
			describeSaved: "图片描述设置已保存。",
			describeFailed: "部署未接受该设置。",
			llmOffNote: "当前没有启用的提供商：图片仍会导出，但不会生成描述，直到你启用一个已填模型的提供商。",
			providerOpenai: "OpenAI",
			providerDeepseek: "DeepSeek",
			providerCustom: "自定义端点",
			activeBadge: "使用中",
			activate: "使用此提供商",
			deactivate: "关闭 LLM 模式",
			baseUrlLabel: "端点（base URL）",
			baseUrlPlaceholder: "https://api.example.com/v1",
			baseUrlHint: "OpenAI 兼容端点；留空则使用提供商默认地址。",
			modelLabel: "模型",
			modelPlaceholder: "例如 gpt-4o",
			modelHint: "保存模型名会为该提供商开启 LLM 模式；清空则对该提供商关闭。",
			keyLabel: "API 密钥",
			keyPlaceholder: "粘贴 API 密钥",
			keyConfigured: "已存储密钥。",
			keyNotConfigured: "尚未存储密钥。",
			keyChecking: "正在检查密钥…",
			keySave: "保存密钥",
			keyClear: "清除",
			keySaved: "API 密钥已存储。",
			keyCleared: "已移除存储的 API 密钥。",
			keyFailed: "凭证存储拒绝了该密钥。",
			keyInvalid: "请输入非空密钥。",
			keyRefHint: "保存在凭证引用 {ref} 下。",
			saved: "已保存。",
			failed: "部署未接受该修改。",
			activated: "已切换到该提供商。",
			activateFailed: "部署未接受此次切换。",
			deactivated: "已关闭 LLM 模式。",
			readOnly: "本部署的设置为只读。",
			unavailable: "MarkItDown 插件当前未加载。"
		};
		// src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.markitdown";
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.credentials",
			"configForms"
		];
		/**
		* Contribute the MarkItDown settings page while the host serves the plugin's
		* entry.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-markitdown: dictionaries");
			const controller = new MarkitdownSettingsController(ctx);
			ctx.effect(() => () => {
				controller.dispose();
			}, "dsh-markitdown: namespace subscriptions");
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", () => {
				controller.refreshKey();
			}), "dsh-markitdown: key invalidations");
			ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "markitdown",
				order: 120,
				label: () => t("nav"),
				locale: NS,
				inject: () => controller.inject()
			}, MarkitdownSettingsSection))), "dsh-markitdown: settings section");
		}
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
