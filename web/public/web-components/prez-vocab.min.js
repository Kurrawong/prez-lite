var ue = Object.defineProperty;
var c = (t, e) => ue(t, "name", { value: e, configurable: !0 });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const R = globalThis, W = R.ShadowRoot && (R.ShadyCSS === void 0 || R.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, q = Symbol(), Q = /* @__PURE__ */ new WeakMap();
let le = class {
  static {
    c(this, "n");
  }
  constructor(e, i, s) {
    if (this._$cssResult$ = !0, s !== q) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = i;
  }
  get styleSheet() {
    let e = this.o;
    const i = this.t;
    if (W && e === void 0) {
      const s = i !== void 0 && i.length === 1;
      s && (e = Q.get(i)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && Q.set(i, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const fe = /* @__PURE__ */ c((t) => new le(typeof t == "string" ? t : t + "", void 0, q), "r$4"), be = /* @__PURE__ */ c((t, ...e) => {
  const i = t.length === 1 ? t[0] : e.reduce((s, r, o) => s + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[o + 1], t[0]);
  return new le(i, t, q);
}, "i$3"), me = /* @__PURE__ */ c((t, e) => {
  if (W) t.adoptedStyleSheets = e.map((i) => i instanceof CSSStyleSheet ? i : i.styleSheet);
  else for (const i of e) {
    const s = document.createElement("style"), r = R.litNonce;
    r !== void 0 && s.setAttribute("nonce", r), s.textContent = i.cssText, t.appendChild(s);
  }
}, "S$1"), X = W ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let i = "";
  for (const s of e.cssRules) i += s.cssText;
  return fe(i);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: ve, defineProperty: $e, getOwnPropertyDescriptor: ge, getOwnPropertyNames: ye, getOwnPropertySymbols: we, getPrototypeOf: xe } = Object, F = globalThis, Y = F.trustedTypes, _e = Y ? Y.emptyScript : "", Ae = F.reactiveElementPolyfillSupport, D = /* @__PURE__ */ c((t, e) => t, "d$1"), H = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? _e : null;
      break;
    case Object:
    case Array:
      t = t == null ? t : JSON.stringify(t);
  }
  return t;
}, fromAttribute(t, e) {
  let i = t;
  switch (e) {
    case Boolean:
      i = t !== null;
      break;
    case Number:
      i = t === null ? null : Number(t);
      break;
    case Object:
    case Array:
      try {
        i = JSON.parse(t);
      } catch {
        i = null;
      }
  }
  return i;
} }, J = /* @__PURE__ */ c((t, e) => !ve(t, e), "f$1"), ee = { attribute: !0, type: String, converter: H, reflect: !1, useDefault: !1, hasChanged: J };
Symbol.metadata ??= Symbol("metadata"), F.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let E = class extends HTMLElement {
  static {
    c(this, "y");
  }
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, i = ee) {
    if (i.state && (i.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((i = Object.create(i)).wrapped = !0), this.elementProperties.set(e, i), !i.noAccessor) {
      const s = Symbol(), r = this.getPropertyDescriptor(e, s, i);
      r !== void 0 && $e(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, i, s) {
    const { get: r, set: o } = ge(this.prototype, e) ?? { get() {
      return this[i];
    }, set(n) {
      this[i] = n;
    } };
    return { get: r, set(n) {
      const p = r?.call(this);
      o?.call(this, n), this.requestUpdate(e, p, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ee;
  }
  static _$Ei() {
    if (this.hasOwnProperty(D("elementProperties"))) return;
    const e = xe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(D("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(D("properties"))) {
      const i = this.properties, s = [...ye(i), ...we(i)];
      for (const r of s) this.createProperty(r, i[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const i = litPropertyMetadata.get(e);
      if (i !== void 0) for (const [s, r] of i) this.elementProperties.set(s, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [i, s] of this.elementProperties) {
      const r = this._$Eu(i, s);
      r !== void 0 && this._$Eh.set(r, i);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const i = [];
    if (Array.isArray(e)) {
      const s = new Set(e.flat(1 / 0).reverse());
      for (const r of s) i.unshift(X(r));
    } else e !== void 0 && i.push(X(e));
    return i;
  }
  static _$Eu(e, i) {
    const s = i.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
  }
  addController(e) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
  }
  removeController(e) {
    this._$EO?.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), i = this.constructor.elementProperties;
    for (const s of i.keys()) this.hasOwnProperty(s) && (e.set(s, this[s]), delete this[s]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return me(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, i, s) {
    this._$AK(e, s);
  }
  _$ET(e, i) {
    const s = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, s);
    if (r !== void 0 && s.reflect === !0) {
      const o = (s.converter?.toAttribute !== void 0 ? s.converter : H).toAttribute(i, s.type);
      this._$Em = e, o == null ? this.removeAttribute(r) : this.setAttribute(r, o), this._$Em = null;
    }
  }
  _$AK(e, i) {
    const s = this.constructor, r = s._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const o = s.getPropertyOptions(r), n = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : H;
      this._$Em = r;
      const p = n.fromAttribute(i, o.type);
      this[r] = p ?? this._$Ej?.get(r) ?? p, this._$Em = null;
    }
  }
  requestUpdate(e, i, s, r = !1, o) {
    if (e !== void 0) {
      const n = this.constructor;
      if (r === !1 && (o = this[e]), s ??= n.getPropertyOptions(e), !((s.hasChanged ?? J)(o, i) || s.useDefault && s.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, s)))) return;
      this.C(e, i, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, i, { useDefault: s, reflect: r, wrapped: o }, n) {
    s && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? i ?? this[e]), o !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || s || (i = void 0), this._$AL.set(e, i)), r === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (i) {
      Promise.reject(i);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [r, o] of this._$Ep) this[r] = o;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [r, o] of s) {
        const { wrapped: n } = o, p = this[r];
        n !== !0 || this._$AL.has(r) || p === void 0 || this.C(r, void 0, o, p);
      }
    }
    let e = !1;
    const i = this._$AL;
    try {
      e = this.shouldUpdate(i), e ? (this.willUpdate(i), this._$EO?.forEach((s) => s.hostUpdate?.()), this.update(i)) : this._$EM();
    } catch (s) {
      throw e = !1, this._$EM(), s;
    }
    e && this._$AE(i);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((i) => i.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq &&= this._$Eq.forEach((i) => this._$ET(i, this[i])), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
E.elementStyles = [], E.shadowRootOptions = { mode: "open" }, E[D("elementProperties")] = /* @__PURE__ */ new Map(), E[D("finalized")] = /* @__PURE__ */ new Map(), Ae?.({ ReactiveElement: E }), (F.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Z = globalThis, te = /* @__PURE__ */ c((t) => t, "i$1"), I = Z.trustedTypes, ie = I ? I.createPolicy("lit-html", { createHTML: /* @__PURE__ */ c((t) => t, "createHTML") }) : void 0, ce = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + x, Ce = `<${de}>`, C = document, O = /* @__PURE__ */ c(() => C.createComment(""), "c"), L = /* @__PURE__ */ c((t) => t === null || typeof t != "object" && typeof t != "function", "a"), K = Array.isArray, Se = /* @__PURE__ */ c((t) => K(t) || typeof t?.[Symbol.iterator] == "function", "d"), V = `[ 	
\f\r]`, T = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, se = /-->/g, re = />/g, _ = RegExp(`>|${V}(?:([^\\s"'>=/]+)(${V}*=${V}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), oe = /'/g, ne = /"/g, he = /^(?:script|style|textarea|title)$/i, Ee = /* @__PURE__ */ c((t) => (e, ...i) => ({ _$litType$: t, strings: e, values: i }), "x"), a = Ee(1), k = Symbol.for("lit-noChange"), l = Symbol.for("lit-nothing"), ae = /* @__PURE__ */ new WeakMap(), A = C.createTreeWalker(C, 129);
function pe(t, e) {
  if (!K(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return ie !== void 0 ? ie.createHTML(e) : e;
}
c(pe, "V");
const ke = /* @__PURE__ */ c((t, e) => {
  const i = t.length - 1, s = [];
  let r, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = T;
  for (let p = 0; p < i; p++) {
    const d = t[p];
    let h, f, u = -1, g = 0;
    for (; g < d.length && (n.lastIndex = g, f = n.exec(d), f !== null); ) g = n.lastIndex, n === T ? f[1] === "!--" ? n = se : f[1] !== void 0 ? n = re : f[2] !== void 0 ? (he.test(f[2]) && (r = RegExp("</" + f[2], "g")), n = _) : f[3] !== void 0 && (n = _) : n === _ ? f[0] === ">" ? (n = r ?? T, u = -1) : f[1] === void 0 ? u = -2 : (u = n.lastIndex - f[2].length, h = f[1], n = f[3] === void 0 ? _ : f[3] === '"' ? ne : oe) : n === ne || n === oe ? n = _ : n === se || n === re ? n = T : (n = _, r = void 0);
    const w = n === _ && t[p + 1].startsWith("/>") ? " " : "";
    o += n === T ? d + Ce : u >= 0 ? (s.push(h), d.slice(0, u) + ce + d.slice(u) + x + w) : d + x + (u === -2 ? p : w);
  }
  return [pe(t, o + (t[i] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
}, "N");
class M {
  static {
    c(this, "S");
  }
  constructor({ strings: e, _$litType$: i }, s) {
    let r;
    this.parts = [];
    let o = 0, n = 0;
    const p = e.length - 1, d = this.parts, [h, f] = ke(e, i);
    if (this.el = M.createElement(h, s), A.currentNode = this.el.content, i === 2 || i === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (r = A.nextNode()) !== null && d.length < p; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const u of r.getAttributeNames()) if (u.endsWith(ce)) {
          const g = f[n++], w = r.getAttribute(u).split(x), U = /([.?@])?(.*)/.exec(g);
          d.push({ type: 1, index: o, name: U[2], strings: w, ctor: U[1] === "." ? Te : U[1] === "?" ? De : U[1] === "@" ? Pe : B }), r.removeAttribute(u);
        } else u.startsWith(x) && (d.push({ type: 6, index: o }), r.removeAttribute(u));
        if (he.test(r.tagName)) {
          const u = r.textContent.split(x), g = u.length - 1;
          if (g > 0) {
            r.textContent = I ? I.emptyScript : "";
            for (let w = 0; w < g; w++) r.append(u[w], O()), A.nextNode(), d.push({ type: 2, index: ++o });
            r.append(u[g], O());
          }
        }
      } else if (r.nodeType === 8) if (r.data === de) d.push({ type: 2, index: o });
      else {
        let u = -1;
        for (; (u = r.data.indexOf(x, u + 1)) !== -1; ) d.push({ type: 7, index: o }), u += x.length - 1;
      }
      o++;
    }
  }
  static createElement(e, i) {
    const s = C.createElement("template");
    return s.innerHTML = e, s;
  }
}
function N(t, e, i = t, s) {
  if (e === k) return e;
  let r = s !== void 0 ? i._$Co?.[s] : i._$Cl;
  const o = L(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== o && (r?._$AO?.(!1), o === void 0 ? r = void 0 : (r = new o(t), r._$AT(t, i, s)), s !== void 0 ? (i._$Co ??= [])[s] = r : i._$Cl = r), r !== void 0 && (e = N(t, r._$AS(t, e.values), r, s)), e;
}
c(N, "M");
class Ne {
  static {
    c(this, "R");
  }
  constructor(e, i) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = i;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: i }, parts: s } = this._$AD, r = (e?.creationScope ?? C).importNode(i, !0);
    A.currentNode = r;
    let o = A.nextNode(), n = 0, p = 0, d = s[0];
    for (; d !== void 0; ) {
      if (n === d.index) {
        let h;
        d.type === 2 ? h = new z(o, o.nextSibling, this, e) : d.type === 1 ? h = new d.ctor(o, d.name, d.strings, this, e) : d.type === 6 && (h = new Oe(o, this, e)), this._$AV.push(h), d = s[++p];
      }
      n !== d?.index && (o = A.nextNode(), n++);
    }
    return A.currentNode = C, r;
  }
  p(e) {
    let i = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, i), i += s.strings.length - 2) : s._$AI(e[i])), i++;
  }
}
class z {
  static {
    c(this, "k");
  }
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, i, s, r) {
    this.type = 2, this._$AH = l, this._$AN = void 0, this._$AA = e, this._$AB = i, this._$AM = s, this.options = r, this._$Cv = r?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const i = this._$AM;
    return i !== void 0 && e?.nodeType === 11 && (e = i.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, i = this) {
    e = N(this, e, i), L(e) ? e === l || e == null || e === "" ? (this._$AH !== l && this._$AR(), this._$AH = l) : e !== this._$AH && e !== k && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Se(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== l && L(this._$AH) ? this._$AA.nextSibling.data = e : this.T(C.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: i, _$litType$: s } = e, r = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = M.createElement(pe(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === r) this._$AH.p(i);
    else {
      const o = new Ne(r, this), n = o.u(this.options);
      o.p(i), this.T(n), this._$AH = o;
    }
  }
  _$AC(e) {
    let i = ae.get(e.strings);
    return i === void 0 && ae.set(e.strings, i = new M(e)), i;
  }
  k(e) {
    K(this._$AH) || (this._$AH = [], this._$AR());
    const i = this._$AH;
    let s, r = 0;
    for (const o of e) r === i.length ? i.push(s = new z(this.O(O()), this.O(O()), this, this.options)) : s = i[r], s._$AI(o), r++;
    r < i.length && (this._$AR(s && s._$AB.nextSibling, r), i.length = r);
  }
  _$AR(e = this._$AA.nextSibling, i) {
    for (this._$AP?.(!1, !0, i); e !== this._$AB; ) {
      const s = te(e).nextSibling;
      te(e).remove(), e = s;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class B {
  static {
    c(this, "H");
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, i, s, r, o) {
    this.type = 1, this._$AH = l, this._$AN = void 0, this.element = e, this.name = i, this._$AM = r, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = l;
  }
  _$AI(e, i = this, s, r) {
    const o = this.strings;
    let n = !1;
    if (o === void 0) e = N(this, e, i, 0), n = !L(e) || e !== this._$AH && e !== k, n && (this._$AH = e);
    else {
      const p = e;
      let d, h;
      for (e = o[0], d = 0; d < o.length - 1; d++) h = N(this, p[s + d], i, d), h === k && (h = this._$AH[d]), n ||= !L(h) || h !== this._$AH[d], h === l ? e = l : e !== l && (e += (h ?? "") + o[d + 1]), this._$AH[d] = h;
    }
    n && !r && this.j(e);
  }
  j(e) {
    e === l ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Te extends B {
  static {
    c(this, "I");
  }
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === l ? void 0 : e;
  }
}
class De extends B {
  static {
    c(this, "L");
  }
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== l);
  }
}
class Pe extends B {
  static {
    c(this, "z");
  }
  constructor(e, i, s, r, o) {
    super(e, i, s, r, o), this.type = 5;
  }
  _$AI(e, i = this) {
    if ((e = N(this, e, i, 0) ?? l) === k) return;
    const s = this._$AH, r = e === l && s !== l || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, o = e !== l && (s === l || r);
    r && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Oe {
  static {
    c(this, "Z");
  }
  constructor(e, i, s) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = i, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    N(this, e);
  }
}
const Le = Z.litHtmlPolyfillSupport;
Le?.(M, z), (Z.litHtmlVersions ??= []).push("3.3.2");
const Me = /* @__PURE__ */ c((t, e, i) => {
  const s = i?.renderBefore ?? e;
  let r = s._$litPart$;
  if (r === void 0) {
    const o = i?.renderBefore ?? null;
    s._$litPart$ = r = new z(e.insertBefore(O(), o), o, void 0, i ?? {});
  }
  return r._$AI(t), r;
}, "D");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const G = globalThis;
class P extends E {
  static {
    c(this, "i");
  }
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const i = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Me(i, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return k;
  }
}
P._$litElement$ = !0, P.finalized = !0, G.litElementHydrateSupport?.({ LitElement: P });
const ze = G.litElementPolyfillSupport;
ze?.({ LitElement: P });
(G.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ue = /* @__PURE__ */ c((t) => (e, i) => {
  i !== void 0 ? i.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
}, "t");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Re = { attribute: !0, type: String, converter: H, reflect: !1, hasChanged: J }, He = /* @__PURE__ */ c((t = Re, e, i) => {
  const { kind: s, metadata: r } = i;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), s === "setter" && ((t = Object.create(t)).wrapped = !0), o.set(i.name, t), s === "accessor") {
    const { name: n } = i;
    return { set(p) {
      const d = e.get.call(this);
      e.set.call(this, p), this.requestUpdate(n, d, t, !0, p);
    }, init(p) {
      return p !== void 0 && this.C(n, void 0, t, p), p;
    } };
  }
  if (s === "setter") {
    const { name: n } = i;
    return function(p) {
      const d = this[n];
      e.call(this, p), this.requestUpdate(n, d, t, !0, p);
    };
  }
  throw Error("Unsupported decorator location: " + s);
}, "r$1");
function m(t) {
  return (e, i) => typeof i == "object" ? He(t, e, i) : ((s, r, o) => {
    const n = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, s), n ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(t, e, i);
}
c(m, "n");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function S(t) {
  return m({ ...t, state: !0, attribute: !1 });
}
c(S, "r");
const j = /* @__PURE__ */ new Map(), Ie = 300 * 1e3;
function je(t) {
  const e = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  for (const o of t)
    if (e.set(o.iri, o), o.broader)
      for (const n of o.broader) {
        const p = i.get(n) || [];
        p.push(o.iri), i.set(n, p);
      }
  const s = t.filter(
    (o) => !o.broader || o.broader.length === 0 || o.broader.every((n) => !e.has(n))
  );
  function r(o) {
    const n = e.get(o);
    if (!n) return null;
    const d = (i.get(o) || []).map((h) => r(h)).filter((h) => h !== null).sort((h, f) => h.label.localeCompare(f.label));
    return {
      iri: n.iri,
      label: n.label,
      notation: n.notation,
      description: n.description,
      children: d
    };
  }
  return c(r, "buildNode"), s.map((o) => r(o.iri)).filter((o) => o !== null).sort((o, n) => o.label.localeCompare(n.label));
}
c(je, "buildTree");
function Fe(t, e) {
  const i = t["@graph"] || [], s = i[0], r = s?.scheme || e, o = s?.schemeLabel || "Vocabulary", n = /* @__PURE__ */ new Map();
  for (const h of i)
    if (h.broader) {
      const f = n.get(h.broader) || [];
      f.push(h.iri), n.set(h.broader, f);
    }
  const p = i.map((h) => ({
    iri: h.iri,
    label: h.prefLabel,
    notation: h.notation,
    description: h.definition,
    // Will be prez:description when export is updated
    altLabels: h.altLabels,
    broader: h.broader ? [h.broader] : void 0,
    narrower: n.get(h.iri)
  })), d = je(p);
  return {
    iri: r,
    label: o,
    description: "",
    concepts: p,
    tree: d
  };
}
c(Fe, "transformListJson");
async function Be(t) {
  const e = j.get(t);
  if (e && Date.now() - e.timestamp < Ie)
    return e.data;
  const i = await fetch(t);
  if (!i.ok)
    throw new Error(`Failed to fetch vocabulary: ${i.status} ${i.statusText}`);
  const s = await i.json();
  let r;
  if (s["@graph"])
    r = Fe(s, t);
  else if (s.concepts && Array.isArray(s.concepts))
    r = s;
  else
    throw new Error("Invalid vocabulary format: unrecognized structure");
  return j.set(t, { data: r, timestamp: Date.now() }), r;
}
c(Be, "fetchVocab");
function Xe(t) {
  t ? j.delete(t) : j.clear();
}
c(Xe, "clearCache");
function Ve() {
  const t = document.querySelectorAll('script[src*="prez-vocab"]');
  if (t.length > 0) {
    const e = t[t.length - 1].src, i = new URL(e), s = i.pathname.split("/");
    return s.pop(), s.pop(), i.pathname = s.join("/") || "/", i.origin + i.pathname.replace(/\/$/, "");
  }
  return null;
}
c(Ve, "detectBaseUrl");
function We(t, e, i) {
  if (e) return e;
  if (!t) return null;
  const s = i || Ve();
  return s ? `${s}/export/${t}/${t}-list.json` : null;
}
c(We, "resolveVocabUrl");
var qe = Object.defineProperty, y = /* @__PURE__ */ c((t, e, i, s) => {
  for (var r = void 0, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = n(e, i, r) || r);
  return r && qe(e, i, r), r;
}, "__decorateClass$1");
class $ extends P {
  static {
    c(this, "PrezVocabBase");
  }
  constructor() {
    super(...arguments), this.vocab = null, this.vocabUrl = null, this.baseUrl = null, this.disabled = !1, this.lang = "en", this.loading = !1, this.error = null, this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map();
  }
  updated(e) {
    super.updated(e), (e.has("vocab") || e.has("vocabUrl") || e.has("baseUrl")) && this.loadVocab();
  }
  async loadVocab() {
    const e = We(this.vocab, this.vocabUrl, this.baseUrl);
    if (!e) {
      this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map();
      return;
    }
    this.loading = !0, this.error = null;
    try {
      this.vocabData = await Be(e), this.conceptMap = new Map(this.vocabData.concepts.map((i) => [i.iri, i])), this.dispatchEvent(new CustomEvent("prez-load", {
        bubbles: !0,
        composed: !0,
        detail: {
          vocab: this.vocab,
          url: e,
          conceptCount: this.vocabData.concepts.length
        }
      }));
    } catch (i) {
      this.error = i instanceof Error ? i.message : "Failed to load vocabulary", this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map(), this.dispatchEvent(new CustomEvent("prez-error", {
        bubbles: !0,
        composed: !0,
        detail: {
          vocab: this.vocab,
          url: e,
          error: this.error
        }
      }));
    } finally {
      this.loading = !1;
    }
  }
  /** Emit change event */
  emitChange(e) {
    this.dispatchEvent(new CustomEvent("prez-change", {
      bubbles: !0,
      composed: !0,
      detail: {
        value: e,
        vocab: this.vocab,
        concepts: Array.isArray(e) ? e.map((i) => this.conceptMap.get(i)).filter(Boolean) : this.conceptMap.get(e) || null
      }
    }));
  }
  /** Emit expand/collapse event */
  emitExpand(e, i) {
    this.dispatchEvent(new CustomEvent("prez-expand", {
      bubbles: !0,
      composed: !0,
      detail: {
        iri: e,
        expanded: i,
        vocab: this.vocab
      }
    }));
  }
  /** Emit filter event */
  emitFilter(e) {
    this.dispatchEvent(new CustomEvent("prez-filter", {
      bubbles: !0,
      composed: !0,
      detail: {
        text: e,
        vocab: this.vocab
      }
    }));
  }
  /** Get label for a concept IRI */
  getConceptLabel(e) {
    return this.conceptMap.get(e)?.label || e.split(/[#/]/).pop() || e;
  }
}
y([
  m({ type: String })
], $.prototype, "vocab");
y([
  m({ type: String, attribute: "vocab-url" })
], $.prototype, "vocabUrl");
y([
  m({ type: String, attribute: "base-url" })
], $.prototype, "baseUrl");
y([
  m({ type: Boolean, reflect: !0 })
], $.prototype, "disabled");
y([
  m({ type: String })
], $.prototype, "lang");
y([
  S()
], $.prototype, "loading");
y([
  S()
], $.prototype, "error");
y([
  S()
], $.prototype, "vocabData");
y([
  S()
], $.prototype, "conceptMap");
var Je = Object.defineProperty, Ze = Object.getOwnPropertyDescriptor, v = /* @__PURE__ */ c((t, e, i, s) => {
  for (var r = s > 1 ? void 0 : s ? Ze(e, i) : e, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (r = (s ? n(e, i, r) : n(r)) || r);
  return s && r && Je(e, i, r), r;
}, "__decorateClass");
let b = class extends $ {
  static {
    c(this, "PrezList");
  }
  constructor() {
    super(...arguments), this.type = "select", this.fields = "", this.multiple = !1, this.flat = !1, this.horizontal = !1, this.search = !1, this.maxLevel = 1, this.showSelected = !0, this.placeholder = "Select...", this.value = null, this.values = [], this.showCount = !1, this.showDescription = !1, this.showIri = !1, this.filterText = "", this.expandedNodes = /* @__PURE__ */ new Set(), this.dropdownOpen = !1, this.boundHandleClickOutside = this.handleClickOutside.bind(this);
  }
  connectedCallback() {
    super.connectedCallback(), document.addEventListener("click", this.boundHandleClickOutside);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), document.removeEventListener("click", this.boundHandleClickOutside);
  }
  handleClickOutside(t) {
    this.dropdownOpen && !this.contains(t.target) && (this.dropdownOpen = !1);
  }
  updated(t) {
    super.updated(t), t.has("vocabData") && this.vocabData && this.initializeExpanded();
  }
  initializeExpanded() {
    if (this.vocabData?.tree) {
      if (this.maxLevel === -1) {
        const t = /* @__PURE__ */ new Set(), e = /* @__PURE__ */ c((i) => {
          for (const s of i)
            s.children.length > 0 && (t.add(s.iri), e(s.children));
        }, "collectIris");
        e(this.vocabData.tree), this.expandedNodes = t;
      } else if (this.maxLevel > 0) {
        const t = /* @__PURE__ */ new Set(), e = /* @__PURE__ */ c((i, s) => {
          if (!(s <= 0))
            for (const r of i)
              r.children.length > 0 && (t.add(r.iri), e(r.children, s - 1));
        }, "expandToLevel");
        e(this.vocabData.tree, this.maxLevel), this.expandedNodes = t;
      }
    }
  }
  handleFilter(t) {
    this.filterText = t.target.value, this.emitFilter(this.filterText);
  }
  toggleExpand(t, e) {
    e.stopPropagation();
    const i = new Set(this.expandedNodes), s = i.has(t);
    s ? i.delete(t) : i.add(t), this.expandedNodes = i, this.emitExpand(t, !s);
  }
  toggleDropdown(t) {
    t.stopPropagation(), this.dropdownOpen = !this.dropdownOpen;
  }
  selectRadio(t) {
    this.value = t, this.emitChange(t);
  }
  selectAll() {
    if (!this.vocabData) return;
    const t = this.filteredConcepts.map((e) => e.iri);
    this.values = t, this.emitChange(t);
  }
  deselectAll() {
    this.values = [], this.emitChange([]);
  }
  selectNode(t) {
    if (this.multiple) {
      const e = this.values.includes(t) ? this.values.filter((i) => i !== t) : [...this.values, t];
      this.values = e, this.emitChange(e);
    } else
      this.value = t, this.emitChange(t), this.type === "dropdown" && (this.dropdownOpen = !1, this.filterText = "");
  }
  handleSelectChange(t) {
    const e = t.target;
    if (this.multiple) {
      const i = Array.from(e.selectedOptions).map((s) => s.value);
      this.values = i, this.emitChange(i);
    } else {
      const i = e.value || null;
      this.value = i, this.emitChange(i || "");
    }
  }
  countDescendants(t) {
    let e = t.children.length;
    for (const i of t.children)
      e += this.countDescendants(i);
    return e;
  }
  collectDescendantIris(t) {
    const e = [t.iri];
    for (const i of t.children)
      e.push(...this.collectDescendantIris(i));
    return e;
  }
  selectNodeWithDescendants(t, e) {
    e.stopPropagation(), e.preventDefault();
    const i = this.collectDescendantIris(t), s = this.values.includes(t.iri);
    let r;
    if (s)
      r = this.values.filter((o) => !i.includes(o));
    else {
      const o = i.filter((n) => !this.values.includes(n));
      r = [...this.values, ...o];
    }
    this.values = r, this.emitChange(r);
  }
  get filteredConcepts() {
    if (!this.vocabData?.concepts) return [];
    let t = this.vocabData.concepts;
    if (this.filterText) {
      const e = this.filterText.toLowerCase();
      t = t.filter(
        (i) => i.label.toLowerCase().includes(e) || i.notation?.toLowerCase().includes(e) || i.altLabels?.some((s) => s.toLowerCase().includes(e))
      );
    }
    return [...t].sort((e, i) => e.label.localeCompare(i.label));
  }
  filterTreeNodes(t) {
    if (!this.filterText) return t;
    const e = this.filterText.toLowerCase(), i = /* @__PURE__ */ c((r) => r.label.toLowerCase().includes(e) || r.notation?.toLowerCase().includes(e), "matchesFilter"), s = /* @__PURE__ */ c((r) => {
      const o = r.children.map(s).filter((n) => n !== null);
      return i(r) || o.length > 0 ? { ...r, children: o } : null;
    }, "filterNode");
    return t.map(s).filter((r) => r !== null);
  }
  renderTreeNode(t) {
    const e = t.children.length > 0, i = this.expandedNodes.has(t.iri) || this.filterText && e, s = this.multiple ? this.values.includes(t.iri) : this.value === t.iri;
    return a`
      <li class="tree-item">
        <div
          class="tree-row ${this.showSelected && s ? "selected" : ""}"
          @click=${() => this.selectNode(t.iri)}
        >
          ${e ? a`
            <button
              class="expand-btn"
              @click=${(r) => this.toggleExpand(t.iri, r)}
              aria-expanded=${i}
              aria-label=${i ? "Collapse" : "Expand"}
            >
              ${i ? a`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 3 L5 7 L9 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : a`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1 L7 5 L3 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
            </button>
          ` : a`<span class="expand-placeholder"></span>`}
          ${this.multiple ? a`
            <input
              type="checkbox"
              class="checkbox"
              .checked=${s}
              @click=${(r) => {
      r.stopPropagation(), this.selectNode(t.iri);
    }}
              @dblclick=${(r) => this.selectNodeWithDescendants(t, r)}
              title="Double-click to select/deselect with all children"
            >
          ` : l}
          ${t.notation ? a`<span class="notation">${t.notation}</span>` : l}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? a`
              <span class="description">${t.description}</span>
            ` : l}
          </div>
          ${this.showCount && e ? a`
            <span class="count">(${this.countDescendants(t)})</span>
          ` : l}
        </div>
        ${e && i ? a`
          <ul class="children">
            ${t.children.map((r) => this.renderTreeNode(r))}
          </ul>
        ` : l}
      </li>
    `;
  }
  findNodePath(t, e = this.vocabData?.tree || [], i = []) {
    for (const s of e) {
      const r = [...i, s.label];
      if (s.iri === t)
        return r;
      if (s.children.length > 0) {
        const o = this.findNodePath(t, s.children, r);
        if (o) return o;
      }
    }
    return null;
  }
  getSelectedLabels() {
    if (this.multiple) {
      if (this.values.length === 0) return "";
      const t = this.values.map((e) => {
        if (!this.flat) {
          const i = this.findNodePath(e);
          if (i) return i.join(" > ");
        }
        return this.vocabData?.concepts.find((i) => i.iri === e)?.label || e;
      }).slice(0, 2);
      return this.values.length > 2 ? `${t.join(", ")} +${this.values.length - 2} more` : t.join(", ");
    } else {
      if (!this.value) return "";
      if (!this.flat) {
        const t = this.findNodePath(this.value);
        if (t) return t.join(" > ");
      }
      return this.vocabData?.concepts.find((t) => t.iri === this.value)?.label || this.value;
    }
  }
  renderDropdownContent() {
    if (this.flat) {
      const e = this.filteredConcepts;
      return e.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : a`
        ${this.renderSelectControls()}
        <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || "Vocabulary list"}>
          ${e.map((i) => {
        const s = this.multiple ? this.values.includes(i.iri) : this.value === i.iri;
        return a`
              <li class="flat-item">
                <div
                  class="tree-row ${this.showSelected && s ? "selected" : ""}"
                  role="option"
                  aria-selected=${s}
                  @click=${() => this.selectNode(i.iri)}
                >
                  ${this.multiple ? a`
                    <input
                      type="checkbox"
                      class="checkbox"
                      .checked=${s}
                      @click=${(r) => {
          r.stopPropagation(), this.selectNode(i.iri);
        }}
                    >
                  ` : l}
                  ${i.notation ? a`<span class="notation">${i.notation}</span>` : l}
                  <div class="item-content">
                    <span class="label">${i.label}</span>
                    ${this.showDescription && i.description ? a`
                      <span class="description">${i.description}</span>
                    ` : l}
                  </div>
                </div>
              </li>
            `;
      })}
        </ul>
      `;
    }
    const t = this.filterTreeNodes(this.vocabData?.tree || []);
    return t.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : a`
      ${this.renderSelectControls()}
      <ul class="tree" role="tree" aria-label=${this.vocabData?.label || "Vocabulary tree"}>
        ${t.map((e) => this.renderTreeNode(e))}
      </ul>
    `;
  }
  handleSearchFocus() {
    this.dropdownOpen = !0;
  }
  handleSearchInput(t) {
    this.filterText = t.target.value, this.emitFilter(this.filterText), this.dropdownOpen || (this.dropdownOpen = !0);
  }
  renderDropdown() {
    const t = this.getSelectedLabels(), e = this.multiple ? this.values.length > 0 : !!this.value;
    return this.search ? a`
        <div class="dropdown">
          <div class="dropdown-trigger ${this.dropdownOpen ? "open" : ""}">
            <input
              type="text"
              class="dropdown-search-input"
              .value=${this.filterText}
              placeholder=${e ? t : this.placeholder}
              @focus=${this.handleSearchFocus}
              @input=${this.handleSearchInput}
              @click=${(i) => i.stopPropagation()}
              aria-haspopup="listbox"
              aria-expanded=${this.dropdownOpen}
            />
            <svg class="dropdown-trigger-icon" viewBox="0 0 20 20" fill="currentColor" @click=${this.toggleDropdown}>
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </div>
          ${this.dropdownOpen ? a`
            <div class="dropdown-popover">
              ${this.renderDropdownContent()}
              ${this.multiple && this.values.length > 0 ? a`
                <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid #e5e7eb;">
                  ${this.values.length} selected
                </div>
              ` : l}
            </div>
          ` : l}
        </div>
      ` : a`
      <div class="dropdown">
        <button
          class="dropdown-trigger ${this.dropdownOpen ? "open" : ""}"
          @click=${this.toggleDropdown}
          aria-haspopup="listbox"
          aria-expanded=${this.dropdownOpen}
        >
          <span class="dropdown-trigger-text ${e ? "" : "dropdown-trigger-placeholder"}">
            ${e ? t : this.placeholder}
          </span>
          <svg class="dropdown-trigger-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
        </button>
        ${this.dropdownOpen ? a`
          <div class="dropdown-popover">
            ${this.renderDropdownContent()}
            ${this.multiple && this.values.length > 0 ? a`
              <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid #e5e7eb;">
                ${this.values.length} selected
              </div>
            ` : l}
          </div>
        ` : l}
      </div>
    `;
  }
  renderSelectControls() {
    if (!this.multiple) return l;
    const t = this.filteredConcepts.length, e = this.values.length;
    return a`
      <div class="select-controls">
        <button @click=${this.selectAll} ?disabled=${e === t}>
          Select all${this.filterText ? " filtered" : ""} (${t})
        </button>
        <button @click=${this.deselectAll} ?disabled=${e === 0}>
          Deselect all
        </button>
      </div>
    `;
  }
  renderTree() {
    const t = this.filterTreeNodes(this.vocabData?.tree || []);
    return t.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : a`
      ${this.renderSelectControls()}
      <ul class="tree" role="tree" aria-label=${this.vocabData?.label || "Vocabulary tree"}>
        ${t.map((e) => this.renderTreeNode(e))}
      </ul>
      ${this.multiple && this.values.length > 0 ? a`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : l}
    `;
  }
  renderRadioNode(t, e) {
    const i = t.children.length > 0, s = t.children.length > 1, r = this.value === t.iri, o = `radio-${this.vocab || "vocab"}`, n = this.horizontal && s && !e;
    return a`
      <div class="radio-node">
        <label class="radio-item">
          <input
            type="radio"
            name=${o}
            .checked=${r}
            @change=${() => this.selectRadio(t.iri)}
          />
          ${t.notation ? a`<span class="notation">${t.notation}</span>` : l}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? a`
              <span class="description">${t.description}</span>
            ` : l}
          </div>
        </label>
        ${i ? a`
          <div class="radio-children ${this.horizontal ? "horizontal" : ""} ${n ? "with-separator" : ""}">
            ${t.children.map((p, d) => {
      const h = e && d === t.children.length - 1;
      return this.renderRadioNode(p, h);
    })}
          </div>
        ` : l}
      </div>
    `;
  }
  renderRadio() {
    const t = this.filterTreeNodes(this.vocabData?.tree || []);
    return t.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : a`
      <div class="radio-group" role="radiogroup" aria-label=${this.vocabData?.label || "Vocabulary selection"}>
        <div class="radio-level ${this.horizontal ? "horizontal" : ""}">
          ${t.map((e, i) => this.renderRadioNode(e, i === t.length - 1))}
        </div>
      </div>
    `;
  }
  get tableFields() {
    return this.fields ? this.fields.split(",").map((t) => t.trim()) : ["iri", "label", "notation", "description"];
  }
  /**
   * Get display label for a field name.
   * Fields use shorthand names that map to VocabConcept properties.
   * Available: iri, label, notation, description, altLabels, broader, narrower
   */
  getFieldLabel(t) {
    return {
      iri: "IRI",
      label: "Label",
      notation: "Notation",
      description: "Description",
      altLabels: "Alt Labels",
      broader: "Broader",
      narrower: "Narrower"
    }[t] || t;
  }
  /**
   * Get value for a field from concept data.
   * Uses shorthand names mapped to VocabConcept properties.
   */
  getFieldValue(t, e) {
    switch (e) {
      case "iri":
        return t.iri;
      case "label":
        return t.label;
      case "notation":
        return t.notation || "";
      case "description":
        return t.description || "";
      case "altLabels":
        return t.altLabels?.join(", ") || "";
      case "broader":
        return t.broader?.join(", ") || "";
      case "narrower":
        return t.narrower?.join(", ") || "";
      default:
        return "";
    }
  }
  renderTableRow(t, e = 0) {
    const i = this.multiple ? this.values.includes(t.iri) : this.value === t.iri, s = this.tableFields;
    return a`
      <tr
        class="${i ? "selected" : ""}"
        @click=${() => this.selectNode(t.iri)}
        style="cursor: pointer"
      >
        ${this.multiple ? a`
          <td class="cell-checkbox">
            <input
              type="checkbox"
              .checked=${i}
              @click=${(r) => {
      r.stopPropagation(), this.selectNode(t.iri);
    }}
            />
          </td>
        ` : l}
        ${s.map((r, o) => a`
          <td class="${r === "iri" ? "cell-iri" : r === "description" ? "cell-description" : ""}">
            ${o === 0 && !this.flat && e > 0 ? a`
              <div class="cell-indent">
                ${Array(e).fill(0).map(() => a`<span class="indent-spacer"></span>`)}
                <span>${this.getFieldValue(t, r)}</span>
              </div>
            ` : this.getFieldValue(t, r)}
          </td>
        `)}
      </tr>
    `;
  }
  renderTableTreeRows(t, e = 0) {
    const i = this.conceptMap.get(t.iri);
    if (!i) return [];
    const s = [this.renderTableRow(i, e)];
    for (const r of t.children)
      s.push(...this.renderTableTreeRows(r, e + 1));
    return s;
  }
  renderTable() {
    const t = this.tableFields;
    if (this.flat) {
      const i = this.filteredConcepts;
      return i.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : a`
        ${this.renderSelectControls()}
        <table class="vocab-table">
          <thead>
            <tr>
              ${this.multiple ? a`<th class="cell-checkbox"></th>` : l}
              ${t.map((s) => a`<th>${this.getFieldLabel(s)}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${i.map((s) => this.renderTableRow(s, 0))}
          </tbody>
        </table>
        ${this.multiple && this.values.length > 0 ? a`
          <div class="selection-count">
            ${this.values.length} selected
          </div>
        ` : l}
      `;
    }
    const e = this.filterTreeNodes(this.vocabData?.tree || []);
    return e.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : a`
      ${this.renderSelectControls()}
      <table class="vocab-table">
        <thead>
          <tr>
            ${this.multiple ? a`<th class="cell-checkbox"></th>` : l}
            ${t.map((i) => a`<th>${this.getFieldLabel(i)}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${e.flatMap((i) => this.renderTableTreeRows(i, 0))}
        </tbody>
      </table>
      ${this.multiple && this.values.length > 0 ? a`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : l}
    `;
  }
  renderFlatItem(t) {
    const e = this.multiple ? this.values.includes(t.iri) : this.value === t.iri;
    if (this.type === "radio") {
      const i = `radio-${this.vocab || "vocab"}`;
      return a`
        <div class="radio-node">
          <label class="radio-item">
            <input
              type="radio"
              name=${i}
              .checked=${e}
              @change=${() => this.selectRadio(t.iri)}
            />
            ${t.notation ? a`<span class="notation">${t.notation}</span>` : l}
            <div class="item-content">
              <span class="label">${t.label}</span>
              ${this.showDescription && t.description ? a`
                <span class="description">${t.description}</span>
              ` : l}
            </div>
          </label>
        </div>
      `;
    }
    return a`
      <li class="flat-item">
        <div
          class="tree-row ${this.showSelected && e ? "selected" : ""}"
          role="option"
          aria-selected=${e}
          @click=${() => this.selectNode(t.iri)}
        >
          ${this.multiple ? a`
            <input
              type="checkbox"
              class="checkbox"
              .checked=${e}
              @click=${(i) => {
      i.stopPropagation(), this.selectNode(t.iri);
    }}
            >
          ` : l}
          ${t.notation ? a`<span class="notation">${t.notation}</span>` : l}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? a`
              <span class="description">${t.description}</span>
            ` : l}
          </div>
        </div>
      </li>
    `;
  }
  renderFlatList() {
    const t = this.filteredConcepts;
    return t.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : this.type === "radio" ? a`
        <div class="radio-group" role="radiogroup" aria-label=${this.vocabData?.label || "Vocabulary selection"}>
          <div class="radio-level ${this.horizontal ? "horizontal" : ""}">
            ${t.map((e) => this.renderFlatItem(e))}
          </div>
        </div>
      ` : a`
      ${this.renderSelectControls()}
      <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || "Vocabulary list"}>
        ${t.map((e) => this.renderFlatItem(e))}
      </ul>
      ${this.multiple && this.values.length > 0 ? a`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : l}
    `;
  }
  render() {
    return this.loading ? a`<div class="loading">Loading vocabulary...</div>` : this.error ? a`<div class="error">${this.error}</div>` : this.vocabData ? this.type === "dropdown" ? this.renderDropdown() : this.type === "radio" ? a`
        ${this.search ? a`
          <div class="search">
            <input
              type="text"
              .value=${this.filterText}
              @input=${this.handleFilter}
              placeholder="Filter concepts..."
              aria-label="Filter concepts"
            />
          </div>
        ` : l}
        ${this.flat ? this.renderFlatList() : this.renderRadio()}
      ` : this.type === "table" ? a`
        ${this.search ? a`
          <div class="search">
            <input
              type="text"
              .value=${this.filterText}
              @input=${this.handleFilter}
              placeholder="Filter concepts..."
              aria-label="Filter concepts"
            />
          </div>
        ` : l}
        ${this.renderTable()}
      ` : a`
      ${this.search ? a`
        <div class="search">
          <input
            type="text"
            .value=${this.filterText}
            @input=${this.handleFilter}
            placeholder="Filter concepts..."
            aria-label="Filter concepts"
          />
        </div>
      ` : l}
      ${this.flat ? this.renderFlatList() : this.renderTree()}
    ` : a`<div class="loading">No vocabulary specified</div>`;
  }
};
b.styles = be`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
    }

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }

    /* Dropdown container */
    .dropdown {
      position: relative;
    }

    .dropdown-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.875rem;
      cursor: pointer;
      text-align: left;
      gap: 0.5rem;
    }

    .dropdown-trigger:hover {
      border-color: #9ca3af;
    }

    .dropdown-trigger:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .dropdown-trigger.open {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .dropdown-trigger-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-trigger-placeholder {
      color: #9ca3af;
    }

    .dropdown-trigger-icon {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: #6b7280;
      transition: transform 0.15s;
    }

    .dropdown-trigger.open .dropdown-trigger-icon {
      transform: rotate(180deg);
    }

    .dropdown-search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      padding: 0;
      outline: none;
      min-width: 0;
    }

    .dropdown-search-input::placeholder {
      color: #374151;
    }

    .dropdown-trigger:has(.dropdown-search-input) {
      cursor: text;
    }

    .dropdown-popover {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      z-index: 50;
      max-height: 300px;
      overflow-y: auto;
    }

    .dropdown-popover .tree {
      padding: 0.25rem;
    }

    .dropdown-popover .search {
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 0;
    }

    .dropdown-popover .search input {
      margin-bottom: 0;
    }

    /* Search input */
    .search {
      margin-bottom: 0.5rem;
    }

    .search input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .search input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    /* Tree and list styles */
    .tree, .flat-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
    }

    .flat-item {
      /* No special positioning needed for flat list */
    }

    .tree-item {
      position: relative;
    }

    /* Vertical connector line */
    .children {
      position: relative;
      list-style: none;
      padding-left: 1.5rem;
      margin: 0;
    }

    .children::before {
      content: '';
      position: absolute;
      left: 0.625rem;
      top: 0;
      bottom: 0.75rem;
      width: 1px;
      background: #e5e7eb;
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .tree-row:hover {
      background-color: #f3f4f6;
    }

    .tree-row.selected {
      background-color: #dbeafe;
    }

    .expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      border-radius: 0.25rem;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      flex-shrink: 0;
      transition: background-color 0.15s, color 0.15s;
    }

    .expand-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .expand-placeholder {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .checkbox {
      margin-right: 0.25rem;
    }

    .label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notation {
      color: #6b7280;
      font-size: 0.75rem;
    }

    .count {
      color: #9ca3af;
      font-size: 0.75rem;
    }

    .children {
      list-style: none;
      padding-left: 1.25rem;
      margin: 0;
    }

    /* Status styles */
    .loading {
      color: #9ca3af;
      padding: 0.5rem;
    }

    .error {
      color: #ef4444;
      font-size: 0.75rem;
      padding: 0.25rem;
    }

    .empty {
      color: #9ca3af;
      padding: 0.5rem;
    }

    .selection-count {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    /* Radio mode styles */
    .radio-group {
      display: flex;
      flex-direction: column;
    }

    .radio-level {
      display: flex;
      flex-direction: column;
    }

    .radio-level.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: baseline;
    }

    .radio-level.horizontal > .radio-node {
      margin-right: 1rem;
      margin-bottom: 0.5rem;
    }

    .radio-node {
      margin-bottom: 0.5rem;
    }

    .radio-node:last-child {
      margin-bottom: 0;
    }

    .radio-children {
      padding-left: 1.5rem;
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
    }

    .radio-children.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: baseline;
    }

    .radio-children.horizontal > .radio-node {
      margin-right: 1rem;
    }

    .radio-children.with-separator {
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .radio-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .radio-item:hover {
      color: #3b82f6;
    }

    .radio-item input[type="radio"] {
      margin: 0;
      cursor: pointer;
    }

    .radio-item .label {
      cursor: pointer;
    }

    /* Description styles */
    .description {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.125rem;
      line-height: 1.4;
    }

    .item-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .item-content .label {
      flex: none;
    }

    /* Select all/deselect all controls */
    .select-controls {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem 0;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .select-controls button {
      font-size: 0.75rem;
      color: #3b82f6;
      background: none;
      border: none;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }

    .select-controls button:hover:not(:disabled) {
      background: #eff6ff;
    }

    .select-controls button:disabled {
      opacity: 0.6;
      cursor: default;
    }

    /* Table styles */
    .vocab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .vocab-table th {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
      color: #374151;
      background: #f9fafb;
    }

    .vocab-table td {
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    .vocab-table tr:hover {
      background: #f9fafb;
    }

    .vocab-table tr.selected {
      background: #dbeafe;
    }

    .vocab-table tr.selected:hover {
      background: #bfdbfe;
    }

    .vocab-table .cell-indent {
      display: flex;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .vocab-table .indent-spacer {
      width: 1rem;
      flex-shrink: 0;
    }

    .vocab-table .cell-checkbox {
      width: 2rem;
      text-align: center;
    }

    .vocab-table .cell-iri {
      font-family: monospace;
      font-size: 0.75rem;
      color: #6b7280;
      word-break: break-all;
    }

    .vocab-table .cell-description {
      color: #6b7280;
      font-size: 0.8125rem;
    }
  `;
v([
  m({ type: String })
], b.prototype, "type", 2);
v([
  m({ type: String })
], b.prototype, "fields", 2);
v([
  m({ type: Boolean })
], b.prototype, "multiple", 2);
v([
  m({ type: Boolean })
], b.prototype, "flat", 2);
v([
  m({ type: Boolean })
], b.prototype, "horizontal", 2);
v([
  m({ type: Boolean })
], b.prototype, "search", 2);
v([
  m({ type: Number, attribute: "max-level" })
], b.prototype, "maxLevel", 2);
v([
  m({ type: Boolean, attribute: "show-selected" })
], b.prototype, "showSelected", 2);
v([
  m({ type: String })
], b.prototype, "placeholder", 2);
v([
  m({ type: String })
], b.prototype, "value", 2);
v([
  m({ type: Array, attribute: "values" })
], b.prototype, "values", 2);
v([
  m({ type: Boolean, attribute: "show-count" })
], b.prototype, "showCount", 2);
v([
  m({ type: Boolean, attribute: "show-description" })
], b.prototype, "showDescription", 2);
v([
  m({ type: Boolean, attribute: "show-iri" })
], b.prototype, "showIri", 2);
v([
  S()
], b.prototype, "filterText", 2);
v([
  S()
], b.prototype, "expandedNodes", 2);
v([
  S()
], b.prototype, "dropdownOpen", 2);
b = v([
  Ue("prez-list")
], b);
export {
  b as PrezList,
  $ as PrezVocabBase,
  Xe as clearCache,
  Ve as detectBaseUrl,
  Be as fetchVocab,
  We as resolveVocabUrl
};
