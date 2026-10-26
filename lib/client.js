window.__ModuleLoader__.load({
	id: "dsh-markitdown",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// \0rolldown/runtime.js
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
		// node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js
		/**
		* @license React
		* react.production.min.js
		*
		* Copyright (c) Facebook, Inc. and its affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_react_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			var l = Symbol.for("react.element");
			var n = Symbol.for("react.portal");
			var p = Symbol.for("react.fragment");
			var q = Symbol.for("react.strict_mode");
			var r = Symbol.for("react.profiler");
			var t = Symbol.for("react.provider");
			var u = Symbol.for("react.context");
			var v = Symbol.for("react.forward_ref");
			var w = Symbol.for("react.suspense");
			var x = Symbol.for("react.memo");
			var y = Symbol.for("react.lazy");
			var z = Symbol.iterator;
			function A(a) {
				if (null === a || "object" !== typeof a) return null;
				a = z && a[z] || a["@@iterator"];
				return "function" === typeof a ? a : null;
			}
			var B = {
				isMounted: function() {
					return !1;
				},
				enqueueForceUpdate: function() {},
				enqueueReplaceState: function() {},
				enqueueSetState: function() {}
			};
			var C = Object.assign;
			var D = {};
			function E(a, b, e) {
				this.props = a;
				this.context = b;
				this.refs = D;
				this.updater = e || B;
			}
			E.prototype.isReactComponent = {};
			E.prototype.setState = function(a, b) {
				if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
				this.updater.enqueueSetState(this, a, b, "setState");
			};
			E.prototype.forceUpdate = function(a) {
				this.updater.enqueueForceUpdate(this, a, "forceUpdate");
			};
			function F() {}
			F.prototype = E.prototype;
			function G(a, b, e) {
				this.props = a;
				this.context = b;
				this.refs = D;
				this.updater = e || B;
			}
			var H = G.prototype = new F();
			H.constructor = G;
			C(H, E.prototype);
			H.isPureReactComponent = !0;
			var I = Array.isArray;
			var J = Object.prototype.hasOwnProperty;
			var K = { current: null };
			var L = {
				key: !0,
				ref: !0,
				__self: !0,
				__source: !0
			};
			function M(a, b, e) {
				var d, c = {}, k = null, h = null;
				if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
				var g = arguments.length - 2;
				if (1 === g) c.children = e;
				else if (1 < g) {
					for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
					c.children = f;
				}
				if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
				return {
					$$typeof: l,
					type: a,
					key: k,
					ref: h,
					props: c,
					_owner: K.current
				};
			}
			function N(a, b) {
				return {
					$$typeof: l,
					type: a.type,
					key: b,
					ref: a.ref,
					props: a.props,
					_owner: a._owner
				};
			}
			function O(a) {
				return "object" === typeof a && null !== a && a.$$typeof === l;
			}
			function escape(a) {
				var b = {
					"=": "=0",
					":": "=2"
				};
				return "$" + a.replace(/[=:]/g, function(a) {
					return b[a];
				});
			}
			var P = /\/+/g;
			function Q(a, b) {
				return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
			}
			function R(a, b, e, d, c) {
				var k = typeof a;
				if ("undefined" === k || "boolean" === k) a = null;
				var h = !1;
				if (null === a) h = !0;
				else switch (k) {
					case "string":
					case "number":
						h = !0;
						break;
					case "object": switch (a.$$typeof) {
						case l:
						case n: h = !0;
					}
				}
				if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a) {
					return a;
				})) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
				h = 0;
				d = "" === d ? "." : d + ":";
				if (I(a)) for (var g = 0; g < a.length; g++) {
					k = a[g];
					var f = d + Q(k, g);
					h += R(k, b, e, f, c);
				}
				else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done;) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
				else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
				return h;
			}
			function S(a, b, e) {
				if (null == a) return a;
				var d = [], c = 0;
				R(a, d, "", "", function(a) {
					return b.call(e, a, c++);
				});
				return d;
			}
			function T(a) {
				if (-1 === a._status) {
					var b = a._result;
					b = b();
					b.then(function(b) {
						if (0 === a._status || -1 === a._status) a._status = 1, a._result = b;
					}, function(b) {
						if (0 === a._status || -1 === a._status) a._status = 2, a._result = b;
					});
					-1 === a._status && (a._status = 0, a._result = b);
				}
				if (1 === a._status) return a._result.default;
				throw a._result;
			}
			var U = { current: null };
			var V = { transition: null };
			var W = {
				ReactCurrentDispatcher: U,
				ReactCurrentBatchConfig: V,
				ReactCurrentOwner: K
			};
			function X() {
				throw Error("act(...) is not supported in production builds of React.");
			}
			exports.Children = {
				map: S,
				forEach: function(a, b, e) {
					S(a, function() {
						b.apply(this, arguments);
					}, e);
				},
				count: function(a) {
					var b = 0;
					S(a, function() {
						b++;
					});
					return b;
				},
				toArray: function(a) {
					return S(a, function(a) {
						return a;
					}) || [];
				},
				only: function(a) {
					if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
					return a;
				}
			};
			exports.Component = E;
			exports.Fragment = p;
			exports.Profiler = r;
			exports.PureComponent = G;
			exports.StrictMode = q;
			exports.Suspense = w;
			exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
			exports.act = X;
			exports.cloneElement = function(a, b, e) {
				if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
				var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
				if (null != b) {
					void 0 !== b.ref && (k = b.ref, h = K.current);
					void 0 !== b.key && (c = "" + b.key);
					if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
					for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
				}
				var f = arguments.length - 2;
				if (1 === f) d.children = e;
				else if (1 < f) {
					g = Array(f);
					for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
					d.children = g;
				}
				return {
					$$typeof: l,
					type: a.type,
					key: c,
					ref: k,
					props: d,
					_owner: h
				};
			};
			exports.createContext = function(a) {
				a = {
					$$typeof: u,
					_currentValue: a,
					_currentValue2: a,
					_threadCount: 0,
					Provider: null,
					Consumer: null,
					_defaultValue: null,
					_globalName: null
				};
				a.Provider = {
					$$typeof: t,
					_context: a
				};
				return a.Consumer = a;
			};
			exports.createElement = M;
			exports.createFactory = function(a) {
				var b = M.bind(null, a);
				b.type = a;
				return b;
			};
			exports.createRef = function() {
				return { current: null };
			};
			exports.forwardRef = function(a) {
				return {
					$$typeof: v,
					render: a
				};
			};
			exports.isValidElement = O;
			exports.lazy = function(a) {
				return {
					$$typeof: y,
					_payload: {
						_status: -1,
						_result: a
					},
					_init: T
				};
			};
			exports.memo = function(a, b) {
				return {
					$$typeof: x,
					type: a,
					compare: void 0 === b ? null : b
				};
			};
			exports.startTransition = function(a) {
				var b = V.transition;
				V.transition = {};
				try {
					a();
				} finally {
					V.transition = b;
				}
			};
			exports.unstable_act = X;
			exports.useCallback = function(a, b) {
				return U.current.useCallback(a, b);
			};
			exports.useContext = function(a) {
				return U.current.useContext(a);
			};
			exports.useDebugValue = function() {};
			exports.useDeferredValue = function(a) {
				return U.current.useDeferredValue(a);
			};
			exports.useEffect = function(a, b) {
				return U.current.useEffect(a, b);
			};
			exports.useId = function() {
				return U.current.useId();
			};
			exports.useImperativeHandle = function(a, b, e) {
				return U.current.useImperativeHandle(a, b, e);
			};
			exports.useInsertionEffect = function(a, b) {
				return U.current.useInsertionEffect(a, b);
			};
			exports.useLayoutEffect = function(a, b) {
				return U.current.useLayoutEffect(a, b);
			};
			exports.useMemo = function(a, b) {
				return U.current.useMemo(a, b);
			};
			exports.useReducer = function(a, b, e) {
				return U.current.useReducer(a, b, e);
			};
			exports.useRef = function(a) {
				return U.current.useRef(a);
			};
			exports.useState = function(a) {
				return U.current.useState(a);
			};
			exports.useSyncExternalStore = function(a, b, e) {
				return U.current.useSyncExternalStore(a, b, e);
			};
			exports.useTransition = function() {
				return U.current.useTransition();
			};
			exports.version = "18.3.1";
		}));
		// node_modules/.pnpm/react@18.3.1/node_modules/react/index.js
		var require_react = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_react_production_min();
		}));
		// src/client/contract.ts
		var import_react = require_react();
		/**
		* Shared contract of the MarkItDown settings tab: the host entry namespace it
		* configures, the provider presets the tab offers, and the state surface the
		* tab renders.
		*/
		/** Host cordis entry id the plugin's bundle patch installs. */
		const ENTRY_ID = "markitdown";
		/** Default credential reference the host resolves the API key from. */
		const DEFAULT_KEY_REF = "OPENAI_API_KEY";
		/** Provider presets the tab offers; `custom` only reselects manual entry. */
		const LLM_PROVIDER_PRESETS = [
			{
				id: "openai",
				baseUrl: "https://api.openai.com/v1",
				model: "gpt-4o"
			},
			{
				id: "deepseek",
				baseUrl: "https://api.deepseek.com/v1",
				model: "deepseek-chat"
			},
			{
				id: "custom",
				baseUrl: "",
				model: ""
			}
		];
		// node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.production.min.js
		/**
		* @license React
		* react-jsx-runtime.production.min.js
		*
		* Copyright (c) Facebook, Inc. and its affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_react_jsx_runtime_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			var f = require_react();
			var k = Symbol.for("react.element");
			var m = Object.prototype.hasOwnProperty;
			var n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
			var p = {
				key: !0,
				ref: !0,
				__self: !0,
				__source: !0
			};
			function q(c, a, g) {
				var b, d = {}, e = null, h = null;
				void 0 !== g && (e = "" + g);
				void 0 !== a.key && (e = "" + a.key);
				void 0 !== a.ref && (h = a.ref);
				for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
				if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
				return {
					$$typeof: k,
					type: c,
					key: e,
					ref: h,
					props: d,
					_owner: n.current
				};
			}
			exports.jsx = q;
			exports.jsxs = q;
		}));
		// src/client/MarkitdownSettingsTab.tsx
		/**
		* The MarkItDown settings tab: provider presets, endpoint/model fields, and
		* the API key row. The key is write-only — it goes to the credential store
		* and its value never renders back into the form.
		*/
		var import_jsx_runtime = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_react_jsx_runtime_production_min();
		})))();
		/** Render the provider/key form, as the Plugins settings section asks. */
		function MarkitdownSettingsTab(props) {
			const { t, saveField, saveKey, clearKey } = props;
			const state = props.useMarkitdownSettings((snapshot) => snapshot);
			const [keyInput, setKeyInput] = (0, import_react.useState)("");
			if (state.status === "unavailable") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: css.note,
				children: t("unavailable")
			});
			const disabled = !state.writable || state.busy;
			const selection = providerSelectionOf(state.llmBaseUrl);
			const applyPreset = (id) => {
				const preset = LLM_PROVIDER_PRESETS.find((candidate) => candidate.id === id);
				if (preset === void 0 || preset.id === "custom") return;
				saveField("llmBaseUrl", preset.baseUrl);
				saveField("llmModel", preset.model);
			};
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: css.column,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.description,
						children: t("description")
					}),
					!state.llmEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.note,
						children: t("llmOffNote")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: css.field,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: css.label,
							children: t("providerLabel")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: css.options,
							role: "radiogroup",
							"aria-label": t("providerLabel"),
							children: LLM_PROVIDER_PRESETS.map((preset) => {
								const active = preset.id !== "custom" && selection.kind === "preset" && selection.id === preset.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									role: "radio",
									"aria-checked": active,
									disabled: disabled || preset.id === "custom",
									style: active ? {
										...css.option,
										...css.optionActive
									} : css.option,
									onClick: () => {
										applyPreset(preset.id);
									},
									children: t(preset.id === "openai" ? "providerOpenai" : preset.id === "deepseek" ? "providerDeepseek" : "providerCustom")
								}, preset.id);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlurField, {
						label: t("baseUrlLabel"),
						hint: t("baseUrlHint"),
						placeholder: t("baseUrlPlaceholder"),
						value: state.llmBaseUrl,
						disabled,
						onSave: (value) => saveField("llmBaseUrl", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlurField, {
						label: t("modelLabel"),
						hint: t("modelHint"),
						placeholder: t("modelPlaceholder"),
						value: state.llmModel,
						disabled,
						onSave: (value) => saveField("llmModel", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlurField, {
						label: t("keyRefLabel"),
						hint: t("keyRefHint"),
						placeholder: DEFAULT_KEY_REF_PLACEHOLDER,
						value: state.llmApiKeyEnv,
						disabled,
						onSave: (value) => saveField("llmApiKeyEnv", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: css.field,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: css.label,
								children: t("keyLabel")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: css.keyRow,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "password",
										style: css.input,
										placeholder: t("keyPlaceholder"),
										value: keyInput,
										disabled,
										onChange: (event) => setKeyInput(event.target.value)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										style: css.primary,
										disabled: disabled || keyInput.trim() === "",
										onClick: () => {
											saveKey(keyInput).then((ok) => {
												if (ok) setKeyInput("");
											});
										},
										children: t("keySave")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										style: css.option,
										disabled: disabled || state.keyConfigured !== true,
										onClick: () => {
											clearKey();
										},
										children: t("keyClear")
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: css.hint,
								children: state.keyConfigured === void 0 ? t("keyChecking") : state.keyConfigured ? t("keyConfigured") : t("keyNotConfigured")
							})
						]
					}),
					state.notice !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.note,
						role: "status",
						children: noticeText(t, state)
					}) : null,
					!state.writable && state.status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.note,
						children: t("readOnly")
					}) : null
				]
			});
		}
		const DEFAULT_KEY_REF_PLACEHOLDER = "OPENAI_API_KEY";
		/** One text field that saves its (trimmed) contents on blur or Enter. */
		function BlurField(props) {
			const [draft, setDraft] = (0, import_react.useState)(void 0);
			const shown = draft ?? props.value;
			const commit = () => {
				if (draft !== void 0 && draft.trim() !== props.value) props.onSave(draft);
				setDraft(void 0);
			};
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: css.field,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: css.label,
						children: props.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						style: css.input,
						placeholder: props.placeholder,
						value: shown,
						disabled: props.disabled,
						onChange: (event) => setDraft(event.target.value),
						onBlur: commit,
						onKeyDown: (event) => {
							if (event.key === "Enter") commit();
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: css.hint,
						children: props.hint
					})
				]
			});
		}
		/** Map the configured endpoint onto a preset (or custom). */
		function providerSelectionOf(baseUrl) {
			const normalized = baseUrl.trim().replace(/\/+$/u, "");
			const preset = LLM_PROVIDER_PRESETS.find((candidate) => candidate.id !== "custom" && candidate.baseUrl === normalized);
			return preset === void 0 ? {
				kind: "custom",
				baseUrl: normalized
			} : {
				kind: "preset",
				id: preset.id
			};
		}
		/** Localized text of the latest write outcome. */
		function noticeText(t, state) {
			const notice = state.notice;
			if (notice === void 0) return "";
			switch (notice.kind) {
				case "saved": return t("saved");
				case "failed": return t("failed");
				case "keySaved": return t("keySaved");
				case "keyCleared": return t("keyCleared");
				case "keyFailed": return t("keyFailed");
			}
		}
		/** Inline styles: the standalone client bundle carries no CSS pipeline. */
		const css = {
			column: {
				display: "flex",
				flexDirection: "column",
				gap: 14,
				maxWidth: 560
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
			options: {
				display: "flex",
				gap: 8,
				flexWrap: "wrap"
			},
			option: {
				padding: "6px 12px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				cursor: "pointer"
			},
			optionActive: {
				borderColor: "Highlight",
				outline: "1px solid Highlight"
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
			}
		};
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
		/** Follows the entry namespace and performs the tab's writes. */
		var MarkitdownSettingsController = class {
			ctx;
			store = createSnapshotStore({
				status: "loading",
				writable: false,
				llmEnabled: false,
				llmModel: "",
				llmBaseUrl: "",
				llmApiKeyEnv: DEFAULT_KEY_REF,
				keyConfigured: void 0,
				busy: false,
				notice: void 0
			});
			form;
			/** Reference the last credentials answer describes; a stale one is dropped. */
			keyRef = DEFAULT_KEY_REF;
			keyConfigured;
			unsubscribe;
			/**
			* @param ctx - the browser plugin context, whose `configForms` service binds
			* the entry namespace and whose `remote.credentials` answers for the key.
			*/
			constructor(ctx) {
				this.ctx = ctx;
				this.form = ctx.configForms.get(ENTRY_ID);
				this.unsubscribe = this.form.subscribe(() => {
					this.derive();
				});
				this.derive();
				this.readKey();
			}
			/** Build the face the tab's slot registration injects. */
			inject() {
				return {
					hooks: { markitdownSettings: this.store },
					saveField: (field, value) => this.saveField(field, value),
					saveKey: (value) => this.saveKey(value),
					clearKey: () => this.clearKey()
				};
			}
			/** Re-read the key after the host reports a change to the watched reference. */
			refreshKey() {
				this.readKey();
			}
			/** Release namespace subscriptions. */
			dispose() {
				this.unsubscribe();
			}
			/** Save one scalar field; an empty string clears it (LLM mode off for the model). */
			async saveField(field, value) {
				const snapshot = this.store.getSnapshot();
				if (!snapshot.writable || snapshot.busy) return;
				const trimmed = value.trim();
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const accepted = trimmed === "" ? await this.form.unset(field) : await this.form.set(field, trimmed);
					this.store.update((draft) => {
						draft.busy = false;
						draft.notice = {
							kind: accepted ? "saved" : "failed",
							field
						};
					});
					if (accepted && field === "llmApiKeyEnv") this.readKey();
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Store the API key in the credential store; resolves whether it accepted. */
			async saveKey(value) {
				const trimmed = value.trim();
				if (trimmed === "") {
					this.store.update((draft) => {
						draft.notice = { kind: "keyFailed" };
					});
					return false;
				}
				if (this.store.getSnapshot().busy) return false;
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const response = await this.ctx.remote.credentials.set(this.keyRef, trimmed);
					this.keyConfigured = response.ok;
					this.store.update((draft) => {
						draft.busy = false;
						draft.keyConfigured = response.ok;
						draft.notice = { kind: response.ok ? "keySaved" : "keyFailed" };
					});
					return response.ok;
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Remove the stored API key; an absent key is a no-op on the host. */
			async clearKey() {
				if (this.store.getSnapshot().busy) return;
				this.store.update((draft) => {
					draft.busy = true;
					draft.notice = void 0;
				});
				try {
					const response = await this.ctx.remote.credentials.unset(this.keyRef);
					if (response.ok) this.keyConfigured = false;
					this.store.update((draft) => {
						draft.busy = false;
						draft.keyConfigured = response.ok ? false : this.keyConfigured;
						draft.notice = { kind: response.ok ? "keyCleared" : "keyFailed" };
					});
				} finally {
					if (this.store.getSnapshot().busy) this.store.update((draft) => {
						draft.busy = false;
					});
				}
			}
			/** Ask the credentials domain whether the watched reference holds a key. */
			async readKey() {
				const configured = this.form.getSnapshot().value?.llmApiKeyEnv;
				const ref = typeof configured === "string" && configured.trim() !== "" ? configured.trim() : DEFAULT_KEY_REF;
				if (ref !== this.keyRef) {
					this.keyRef = ref;
					this.keyConfigured = void 0;
					this.publish();
				}
				const response = await this.ctx.remote.credentials.describe([this.keyRef]);
				if (!response.ok || this.keyRef !== ref) return;
				const configuredNow = response.value[this.keyRef]?.configured ?? false;
				if (configuredNow === this.keyConfigured) return;
				this.keyConfigured = configuredNow;
				this.publish();
			}
			/** Fold the form snapshot into the tab state. */
			derive() {
				const snapshot = this.form.getSnapshot();
				const value = snapshot.value;
				const llmModel = typeof value?.llmModel === "string" ? value.llmModel : "";
				const llmBaseUrl = typeof value?.llmBaseUrl === "string" ? value.llmBaseUrl : "";
				const llmApiKeyEnv = typeof value?.llmApiKeyEnv === "string" && value.llmApiKeyEnv !== "" ? value.llmApiKeyEnv : DEFAULT_KEY_REF;
				this.store.update((draft) => {
					draft.status = snapshot.status;
					draft.writable = snapshot.writable;
					draft.llmEnabled = llmModel.trim() !== "";
					draft.llmModel = llmModel;
					draft.llmBaseUrl = llmBaseUrl;
					draft.llmApiKeyEnv = llmApiKeyEnv;
				});
				this.readKey();
			}
			/** Fold the key answer into the snapshot without touching the rest. */
			publish() {
				const keyConfigured = this.keyConfigured;
				this.store.update((draft) => {
					draft.keyConfigured = keyConfigured;
				});
			}
		};
		// src/client/locales.ts
		/** English copy. */
		const en = {
			tab: "MarkItDown",
			title: "MarkItDown LLM provider",
			description: "LLM-assisted conversion describes embedded images in Office documents instead of emitting raw data URIs. Pick a provider, enter a model, and store the API key — the key is kept in the dsh credential store, never in the profile configuration.",
			llmOffNote: "LLM mode is off until a model name is saved.",
			providerLabel: "Provider",
			providerOpenai: "OpenAI",
			providerDeepseek: "DeepSeek",
			providerCustom: "Custom endpoint",
			baseUrlLabel: "Endpoint (base URL)",
			baseUrlPlaceholder: "https://api.example.com/v1",
			baseUrlHint: "OpenAI-compatible endpoint; leave empty for the provider default.",
			modelLabel: "Model",
			modelPlaceholder: "e.g. gpt-4o",
			modelHint: "Saving a model name switches conversions to LLM mode.",
			keyRefLabel: "Key reference",
			keyRefHint: "Name the credential is stored under; default OPENAI_API_KEY. Changing it means the key must be stored again.",
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
			saved: "Saved.",
			failed: "The deployment did not accept the change.",
			readOnly: "This deployment stores settings read-only.",
			unavailable: "The MarkItDown plugin is not loaded right now."
		};
		/** Simplified Chinese copy. */
		const zh = {
			tab: "MarkItDown",
			title: "MarkItDown LLM 提供商",
			description: "LLM 辅助转换会把 Office 文档中的内嵌图片描述成文字，而不是输出原始 data URI。选择一个提供商、填写模型名并保存 API 密钥——密钥存放在 dsh 凭证存储中，不会写进配置文件。",
			llmOffNote: "保存模型名后才会开启 LLM 模式。",
			providerLabel: "提供商",
			providerOpenai: "OpenAI",
			providerDeepseek: "DeepSeek",
			providerCustom: "自定义端点",
			baseUrlLabel: "端点（base URL）",
			baseUrlPlaceholder: "https://api.example.com/v1",
			baseUrlHint: "OpenAI 兼容端点；留空则使用提供商默认地址。",
			modelLabel: "模型",
			modelPlaceholder: "例如 gpt-4o",
			modelHint: "保存模型名后，转换即切换为 LLM 模式。",
			keyRefLabel: "密钥引用名",
			keyRefHint: "密钥存入凭证存储时使用的名字，默认 OPENAI_API_KEY；修改后需要重新保存密钥。",
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
			saved: "已保存。",
			failed: "部署未接受该修改。",
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
		* Contribute the MarkItDown tab while the host serves the plugin's entry.
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
			ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "markitdown",
				order: 20,
				label: () => t("tab"),
				locale: NS,
				inject: () => controller.inject()
			}, MarkitdownSettingsTab))), "dsh-markitdown: settings tab");
		}
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
