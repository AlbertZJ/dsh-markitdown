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
		// node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js
		var require_jsx_runtime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_react_jsx_runtime_production_min();
		}));
		// src/client/MarkitdownSettingsSection.tsx
		var import_react = require_react();
		var import_jsx_runtime = require_jsx_runtime();
		/** Render the per-provider form, as the settings shell asks. */
		function MarkitdownSettingsSection(props) {
			const { t, saveProviderField, activateProvider, deactivateProvider, saveKey, clearKey } = props;
			const state = props.useMarkitdownSettings((snapshot) => snapshot);
			const [keyInputs, setKeyInputs] = (0, import_react.useState)({});
			if (state.status === "unavailable") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: css.note,
				children: t("unavailable")
			});
			const disabled = !state.writable || state.busy;
			const setKeyInput = (provider, value) => {
				setKeyInputs((draft) => ({
					...draft,
					[provider]: value
				}));
			};
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: css.column,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.description,
						children: t("description")
					}),
					!state.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.note,
						children: t("llmOffNote")
					}) : null,
					state.providers.map((provider) => {
						const keyInput = keyInputs[provider.id] ?? "";
						const notice = noticeFor(state.notice, provider.id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							style: provider.active ? {
								...css.card,
								...css.cardActive
							} : css.card,
							"aria-label": providerLabel(t, provider.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
									style: css.cardHeader,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: css.cardTitle,
										children: providerLabel(t, provider.id)
									}), provider.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										style: css.activeRow,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: css.badge,
											children: t("activeBadge")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											style: css.linkButton,
											disabled,
											onClick: () => {
												deactivateProvider();
											},
											children: t("deactivate")
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										style: css.option,
										disabled,
										onClick: () => {
											activateProvider(provider.id);
										},
										children: t("activate")
									})]
								}),
								provider.id === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlurField, {
									label: t("baseUrlLabel"),
									hint: t("baseUrlHint"),
									placeholder: t("baseUrlPlaceholder"),
									value: provider.baseUrl,
									disabled,
									onSave: (value) => saveProviderField(provider.id, "baseUrl", value)
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: css.hint,
									children: provider.baseUrl
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlurField, {
									label: t("modelLabel"),
									hint: t("modelHint"),
									placeholder: t("modelPlaceholder"),
									value: provider.model,
									disabled,
									onSave: (value) => saveProviderField(provider.id, "model", value)
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
													onChange: (event) => setKeyInput(provider.id, event.currentTarget.value)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
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
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
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
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: css.hint,
											children: [
												t("keyRefHint", { ref: provider.apiKeyEnv }),
												" · ",
												keyStateText(t, provider)
											]
										})
									]
								}),
								notice !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									style: css.note,
									role: "status",
									children: noticeText(t, notice)
								}) : null
							]
						}, provider.id);
					}),
					!state.writable && state.status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: css.note,
						children: t("readOnly")
					}) : null
				]
			});
		}
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
						onChange: (event) => setDraft(event.currentTarget.value),
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
			return notice?.provider === provider ? notice : void 0;
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
			description: "LLM-assisted conversion describes embedded images in Office documents instead of emitting raw data URIs. Each provider keeps its own model and API key; the active provider is the one conversions use. Keys are kept in the dsh credential store, never in the profile configuration.",
			llmOffNote: "No provider is active: conversions run without LLM assistance until you activate one that has a model.",
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
			description: "LLM 辅助转换会把 Office 文档中的内嵌图片描述成文字，而不是输出原始 data URI。每个提供商各自保存模型和 API 密钥；转换使用当前启用的那一个。密钥存放在 dsh 凭证存储中，不会写进配置文件。",
			llmOffNote: "当前没有启用的提供商：在启用一个已填模型的提供商之前，转换不会使用 LLM。",
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
