var ue = Object.defineProperty;
var d = (t, e) => ue(t, "name", { value: e, configurable: !0 });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const R = globalThis, W = R.ShadowRoot && (R.ShadyCSS === void 0 || R.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, q = Symbol(), Q = /* @__PURE__ */ new WeakMap();
let le = class {
  static {
    d(this, "n");
  }
  constructor(e, r, i) {
    if (this._$cssResult$ = !0, i !== q) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = r;
  }
  get styleSheet() {
    let e = this.o;
    const r = this.t;
    if (W && e === void 0) {
      const i = r !== void 0 && r.length === 1;
      i && (e = Q.get(r)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Q.set(r, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const fe = /* @__PURE__ */ d((t) => new le(typeof t == "string" ? t : t + "", void 0, q), "r$4"), be = /* @__PURE__ */ d((t, ...e) => {
  const r = t.length === 1 ? t[0] : e.reduce((i, s, o) => i + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + t[o + 1], t[0]);
  return new le(r, t, q);
}, "i$3"), ve = /* @__PURE__ */ d((t, e) => {
  if (W) t.adoptedStyleSheets = e.map((r) => r instanceof CSSStyleSheet ? r : r.styleSheet);
  else for (const r of e) {
    const i = document.createElement("style"), s = R.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = r.cssText, t.appendChild(i);
  }
}, "S$1"), X = W ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let r = "";
  for (const i of e.cssRules) r += i.cssText;
  return fe(r);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: me, defineProperty: ge, getOwnPropertyDescriptor: $e, getOwnPropertyNames: ye, getOwnPropertySymbols: we, getPrototypeOf: xe } = Object, F = globalThis, Y = F.trustedTypes, _e = Y ? Y.emptyScript : "", ze = F.reactiveElementPolyfillSupport, T = /* @__PURE__ */ d((t, e) => t, "d$1"), H = { toAttribute(t, e) {
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
  let r = t;
  switch (e) {
    case Boolean:
      r = t !== null;
      break;
    case Number:
      r = t === null ? null : Number(t);
      break;
    case Object:
    case Array:
      try {
        r = JSON.parse(t);
      } catch {
        r = null;
      }
  }
  return r;
} }, J = /* @__PURE__ */ d((t, e) => !me(t, e), "f$1"), ee = { attribute: !0, type: String, converter: H, reflect: !1, useDefault: !1, hasChanged: J };
Symbol.metadata ??= Symbol("metadata"), F.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let S = class extends HTMLElement {
  static {
    d(this, "y");
  }
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, r = ee) {
    if (r.state && (r.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((r = Object.create(r)).wrapped = !0), this.elementProperties.set(e, r), !r.noAccessor) {
      const i = Symbol(), s = this.getPropertyDescriptor(e, i, r);
      s !== void 0 && ge(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, r, i) {
    const { get: s, set: o } = $e(this.prototype, e) ?? { get() {
      return this[r];
    }, set(a) {
      this[r] = a;
    } };
    return { get: s, set(a) {
      const p = s?.call(this);
      o?.call(this, a), this.requestUpdate(e, p, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ee;
  }
  static _$Ei() {
    if (this.hasOwnProperty(T("elementProperties"))) return;
    const e = xe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(T("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(T("properties"))) {
      const r = this.properties, i = [...ye(r), ...we(r)];
      for (const s of i) this.createProperty(s, r[s]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const r = litPropertyMetadata.get(e);
      if (r !== void 0) for (const [i, s] of r) this.elementProperties.set(i, s);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [r, i] of this.elementProperties) {
      const s = this._$Eu(r, i);
      s !== void 0 && this._$Eh.set(s, r);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const r = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const s of i) r.unshift(X(s));
    } else e !== void 0 && r.push(X(e));
    return r;
  }
  static _$Eu(e, r) {
    const i = r.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
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
    const e = /* @__PURE__ */ new Map(), r = this.constructor.elementProperties;
    for (const i of r.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ve(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, r, i) {
    this._$AK(e, i);
  }
  _$ET(e, r) {
    const i = this.constructor.elementProperties.get(e), s = this.constructor._$Eu(e, i);
    if (s !== void 0 && i.reflect === !0) {
      const o = (i.converter?.toAttribute !== void 0 ? i.converter : H).toAttribute(r, i.type);
      this._$Em = e, o == null ? this.removeAttribute(s) : this.setAttribute(s, o), this._$Em = null;
    }
  }
  _$AK(e, r) {
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const o = i.getPropertyOptions(s), a = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : H;
      this._$Em = s;
      const p = a.fromAttribute(r, o.type);
      this[s] = p ?? this._$Ej?.get(s) ?? p, this._$Em = null;
    }
  }
  requestUpdate(e, r, i, s = !1, o) {
    if (e !== void 0) {
      const a = this.constructor;
      if (s === !1 && (o = this[e]), i ??= a.getPropertyOptions(e), !((i.hasChanged ?? J)(o, r) || i.useDefault && i.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, i)))) return;
      this.C(e, r, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, r, { useDefault: i, reflect: s, wrapped: o }, a) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? r ?? this[e]), o !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (r = void 0), this._$AL.set(e, r)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (r) {
      Promise.reject(r);
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
        for (const [s, o] of this._$Ep) this[s] = o;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [s, o] of i) {
        const { wrapped: a } = o, p = this[s];
        a !== !0 || this._$AL.has(s) || p === void 0 || this.C(s, void 0, o, p);
      }
    }
    let e = !1;
    const r = this._$AL;
    try {
      e = this.shouldUpdate(r), e ? (this.willUpdate(r), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(r)) : this._$EM();
    } catch (i) {
      throw e = !1, this._$EM(), i;
    }
    e && this._$AE(r);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((r) => r.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
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
    this._$Eq &&= this._$Eq.forEach((r) => this._$ET(r, this[r])), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[T("elementProperties")] = /* @__PURE__ */ new Map(), S[T("finalized")] = /* @__PURE__ */ new Map(), ze?.({ ReactiveElement: S }), (F.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Z = globalThis, te = /* @__PURE__ */ d((t) => t, "i$1"), I = Z.trustedTypes, re = I ? I.createPolicy("lit-html", { createHTML: /* @__PURE__ */ d((t) => t, "createHTML") }) : void 0, de = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, ce = "?" + x, Ae = `<${ce}>`, A = document, P = /* @__PURE__ */ d(() => A.createComment(""), "c"), O = /* @__PURE__ */ d((t) => t === null || typeof t != "object" && typeof t != "function", "a"), K = Array.isArray, Ce = /* @__PURE__ */ d((t) => K(t) || typeof t?.[Symbol.iterator] == "function", "d"), V = `[ 	
\f\r]`, N = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ie = /-->/g, se = />/g, _ = RegExp(`>|${V}(?:([^\\s"'>=/]+)(${V}*=${V}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), oe = /'/g, ae = /"/g, he = /^(?:script|style|textarea|title)$/i, Se = /* @__PURE__ */ d((t) => (e, ...r) => ({ _$litType$: t, strings: e, values: r }), "x"), n = Se(1), E = Symbol.for("lit-noChange"), l = Symbol.for("lit-nothing"), ne = /* @__PURE__ */ new WeakMap(), z = A.createTreeWalker(A, 129);
function pe(t, e) {
  if (!K(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return re !== void 0 ? re.createHTML(e) : e;
}
d(pe, "V");
const Ee = /* @__PURE__ */ d((t, e) => {
  const r = t.length - 1, i = [];
  let s, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = N;
  for (let p = 0; p < r; p++) {
    const c = t[p];
    let h, f, u = -1, y = 0;
    for (; y < c.length && (a.lastIndex = y, f = a.exec(c), f !== null); ) y = a.lastIndex, a === N ? f[1] === "!--" ? a = ie : f[1] !== void 0 ? a = se : f[2] !== void 0 ? (he.test(f[2]) && (s = RegExp("</" + f[2], "g")), a = _) : f[3] !== void 0 && (a = _) : a === _ ? f[0] === ">" ? (a = s ?? N, u = -1) : f[1] === void 0 ? u = -2 : (u = a.lastIndex - f[2].length, h = f[1], a = f[3] === void 0 ? _ : f[3] === '"' ? ae : oe) : a === ae || a === oe ? a = _ : a === ie || a === se ? a = N : (a = _, s = void 0);
    const w = a === _ && t[p + 1].startsWith("/>") ? " " : "";
    o += a === N ? c + Ae : u >= 0 ? (i.push(h), c.slice(0, u) + de + c.slice(u) + x + w) : c + x + (u === -2 ? p : w);
  }
  return [pe(t, o + (t[r] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
}, "N");
class L {
  static {
    d(this, "S");
  }
  constructor({ strings: e, _$litType$: r }, i) {
    let s;
    this.parts = [];
    let o = 0, a = 0;
    const p = e.length - 1, c = this.parts, [h, f] = Ee(e, r);
    if (this.el = L.createElement(h, i), z.currentNode = this.el.content, r === 2 || r === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (s = z.nextNode()) !== null && c.length < p; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const u of s.getAttributeNames()) if (u.endsWith(de)) {
          const y = f[a++], w = s.getAttribute(u).split(x), U = /([.?@])?(.*)/.exec(y);
          c.push({ type: 1, index: o, name: U[2], strings: w, ctor: U[1] === "." ? Ne : U[1] === "?" ? Te : U[1] === "@" ? De : B }), s.removeAttribute(u);
        } else u.startsWith(x) && (c.push({ type: 6, index: o }), s.removeAttribute(u));
        if (he.test(s.tagName)) {
          const u = s.textContent.split(x), y = u.length - 1;
          if (y > 0) {
            s.textContent = I ? I.emptyScript : "";
            for (let w = 0; w < y; w++) s.append(u[w], P()), z.nextNode(), c.push({ type: 2, index: ++o });
            s.append(u[y], P());
          }
        }
      } else if (s.nodeType === 8) if (s.data === ce) c.push({ type: 2, index: o });
      else {
        let u = -1;
        for (; (u = s.data.indexOf(x, u + 1)) !== -1; ) c.push({ type: 7, index: o }), u += x.length - 1;
      }
      o++;
    }
  }
  static createElement(e, r) {
    const i = A.createElement("template");
    return i.innerHTML = e, i;
  }
}
function k(t, e, r = t, i) {
  if (e === E) return e;
  let s = i !== void 0 ? r._$Co?.[i] : r._$Cl;
  const o = O(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== o && (s?._$AO?.(!1), o === void 0 ? s = void 0 : (s = new o(t), s._$AT(t, r, i)), i !== void 0 ? (r._$Co ??= [])[i] = s : r._$Cl = s), s !== void 0 && (e = k(t, s._$AS(t, e.values), s, i)), e;
}
d(k, "M");
class ke {
  static {
    d(this, "R");
  }
  constructor(e, r) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = r;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: r }, parts: i } = this._$AD, s = (e?.creationScope ?? A).importNode(r, !0);
    z.currentNode = s;
    let o = z.nextNode(), a = 0, p = 0, c = i[0];
    for (; c !== void 0; ) {
      if (a === c.index) {
        let h;
        c.type === 2 ? h = new M(o, o.nextSibling, this, e) : c.type === 1 ? h = new c.ctor(o, c.name, c.strings, this, e) : c.type === 6 && (h = new Pe(o, this, e)), this._$AV.push(h), c = i[++p];
      }
      a !== c?.index && (o = z.nextNode(), a++);
    }
    return z.currentNode = A, s;
  }
  p(e) {
    let r = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, r), r += i.strings.length - 2) : i._$AI(e[r])), r++;
  }
}
class M {
  static {
    d(this, "k");
  }
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, r, i, s) {
    this.type = 2, this._$AH = l, this._$AN = void 0, this._$AA = e, this._$AB = r, this._$AM = i, this.options = s, this._$Cv = s?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const r = this._$AM;
    return r !== void 0 && e?.nodeType === 11 && (e = r.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, r = this) {
    e = k(this, e, r), O(e) ? e === l || e == null || e === "" ? (this._$AH !== l && this._$AR(), this._$AH = l) : e !== this._$AH && e !== E && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ce(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== l && O(this._$AH) ? this._$AA.nextSibling.data = e : this.T(A.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: r, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = L.createElement(pe(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(r);
    else {
      const o = new ke(s, this), a = o.u(this.options);
      o.p(r), this.T(a), this._$AH = o;
    }
  }
  _$AC(e) {
    let r = ne.get(e.strings);
    return r === void 0 && ne.set(e.strings, r = new L(e)), r;
  }
  k(e) {
    K(this._$AH) || (this._$AH = [], this._$AR());
    const r = this._$AH;
    let i, s = 0;
    for (const o of e) s === r.length ? r.push(i = new M(this.O(P()), this.O(P()), this, this.options)) : i = r[s], i._$AI(o), s++;
    s < r.length && (this._$AR(i && i._$AB.nextSibling, s), r.length = s);
  }
  _$AR(e = this._$AA.nextSibling, r) {
    for (this._$AP?.(!1, !0, r); e !== this._$AB; ) {
      const i = te(e).nextSibling;
      te(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class B {
  static {
    d(this, "H");
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, r, i, s, o) {
    this.type = 1, this._$AH = l, this._$AN = void 0, this.element = e, this.name = r, this._$AM = s, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = l;
  }
  _$AI(e, r = this, i, s) {
    const o = this.strings;
    let a = !1;
    if (o === void 0) e = k(this, e, r, 0), a = !O(e) || e !== this._$AH && e !== E, a && (this._$AH = e);
    else {
      const p = e;
      let c, h;
      for (e = o[0], c = 0; c < o.length - 1; c++) h = k(this, p[i + c], r, c), h === E && (h = this._$AH[c]), a ||= !O(h) || h !== this._$AH[c], h === l ? e = l : e !== l && (e += (h ?? "") + o[c + 1]), this._$AH[c] = h;
    }
    a && !s && this.j(e);
  }
  j(e) {
    e === l ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ne extends B {
  static {
    d(this, "I");
  }
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === l ? void 0 : e;
  }
}
class Te extends B {
  static {
    d(this, "L");
  }
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== l);
  }
}
class De extends B {
  static {
    d(this, "z");
  }
  constructor(e, r, i, s, o) {
    super(e, r, i, s, o), this.type = 5;
  }
  _$AI(e, r = this) {
    if ((e = k(this, e, r, 0) ?? l) === E) return;
    const i = this._$AH, s = e === l && i !== l || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, o = e !== l && (i === l || s);
    s && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Pe {
  static {
    d(this, "Z");
  }
  constructor(e, r, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = r, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    k(this, e);
  }
}
const Oe = Z.litHtmlPolyfillSupport;
Oe?.(L, M), (Z.litHtmlVersions ??= []).push("3.3.2");
const Le = /* @__PURE__ */ d((t, e, r) => {
  const i = r?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const o = r?.renderBefore ?? null;
    i._$litPart$ = s = new M(e.insertBefore(P(), o), o, void 0, r ?? {});
  }
  return s._$AI(t), s;
}, "D");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const G = globalThis;
class D extends S {
  static {
    d(this, "i");
  }
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const r = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Le(r, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return E;
  }
}
D._$litElement$ = !0, D.finalized = !0, G.litElementHydrateSupport?.({ LitElement: D });
const Me = G.litElementPolyfillSupport;
Me?.({ LitElement: D });
(G.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ue = /* @__PURE__ */ d((t) => (e, r) => {
  r !== void 0 ? r.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
}, "t");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Re = { attribute: !0, type: String, converter: H, reflect: !1, hasChanged: J }, He = /* @__PURE__ */ d((t = Re, e, r) => {
  const { kind: i, metadata: s } = r;
  let o = globalThis.litPropertyMetadata.get(s);
  if (o === void 0 && globalThis.litPropertyMetadata.set(s, o = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), o.set(r.name, t), i === "accessor") {
    const { name: a } = r;
    return { set(p) {
      const c = e.get.call(this);
      e.set.call(this, p), this.requestUpdate(a, c, t, !0, p);
    }, init(p) {
      return p !== void 0 && this.C(a, void 0, t, p), p;
    } };
  }
  if (i === "setter") {
    const { name: a } = r;
    return function(p) {
      const c = this[a];
      e.call(this, p), this.requestUpdate(a, c, t, !0, p);
    };
  }
  throw Error("Unsupported decorator location: " + i);
}, "r$1");
function b(t) {
  return (e, r) => typeof r == "object" ? He(t, e, r) : ((i, s, o) => {
    const a = s.hasOwnProperty(o);
    return s.constructor.createProperty(o, i), a ? Object.getOwnPropertyDescriptor(s, o) : void 0;
  })(t, e, r);
}
d(b, "n");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function C(t) {
  return b({ ...t, state: !0, attribute: !1 });
}
d(C, "r");
const j = /* @__PURE__ */ new Map(), Ie = 300 * 1e3;
function je(t) {
  const e = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  for (const o of t)
    if (e.set(o.iri, o), o.broader)
      for (const a of o.broader) {
        const p = r.get(a) || [];
        p.push(o.iri), r.set(a, p);
      }
  const i = t.filter(
    (o) => !o.broader || o.broader.length === 0 || o.broader.every((a) => !e.has(a))
  );
  function s(o) {
    const a = e.get(o);
    if (!a) return null;
    const c = (r.get(o) || []).map((h) => s(h)).filter((h) => h !== null).sort((h, f) => h.label.localeCompare(f.label));
    return {
      iri: a.iri,
      label: a.label,
      notation: a.notation,
      description: a.description,
      children: c
    };
  }
  return d(s, "buildNode"), i.map((o) => s(o.iri)).filter((o) => o !== null).sort((o, a) => o.label.localeCompare(a.label));
}
d(je, "buildTree");
function Fe(t, e) {
  const r = t["@graph"] || [], i = r[0], s = i?.scheme || e, o = i?.schemeLabel || "Vocabulary", a = /* @__PURE__ */ new Map();
  for (const h of r)
    if (h.broader) {
      const f = a.get(h.broader) || [];
      f.push(h.iri), a.set(h.broader, f);
    }
  const p = r.map((h) => ({
    iri: h.iri,
    label: h.prefLabel,
    notation: h.notation,
    description: h.definition,
    // Will be prez:description when export is updated
    altLabels: h.altLabels,
    broader: h.broader ? [h.broader] : void 0,
    narrower: a.get(h.iri)
  })), c = je(p);
  return {
    iri: s,
    label: o,
    description: "",
    concepts: p,
    tree: c
  };
}
d(Fe, "transformListJson");
async function Be(t) {
  const e = j.get(t);
  if (e && Date.now() - e.timestamp < Ie)
    return e.data;
  const r = await fetch(t);
  if (!r.ok)
    throw new Error(`Failed to fetch vocabulary: ${r.status} ${r.statusText}`);
  const i = await r.json();
  let s;
  if (i["@graph"])
    s = Fe(i, t);
  else if (i.concepts && Array.isArray(i.concepts))
    s = i;
  else
    throw new Error("Invalid vocabulary format: unrecognized structure");
  return j.set(t, { data: s, timestamp: Date.now() }), s;
}
d(Be, "fetchVocab");
function Xe(t) {
  t ? j.delete(t) : j.clear();
}
d(Xe, "clearCache");
function Ve() {
  const t = document.querySelectorAll('script[src*="prez-vocab"]');
  if (t.length > 0) {
    const e = t[t.length - 1].src, r = new URL(e), i = r.pathname.split("/");
    return i.pop(), i.pop(), r.pathname = i.join("/") || "/", r.origin + r.pathname.replace(/\/$/, "");
  }
  return null;
}
d(Ve, "detectBaseUrl");
function We(t, e, r) {
  if (e) return e;
  if (!t) return null;
  const i = r || Ve();
  return i ? `${i}/export/${t}/${t}-list.json` : null;
}
d(We, "resolveVocabUrl");
var qe = Object.defineProperty, $ = /* @__PURE__ */ d((t, e, r, i) => {
  for (var s = void 0, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (s = a(e, r, s) || s);
  return s && qe(e, r, s), s;
}, "__decorateClass$1");
class g extends D {
  static {
    d(this, "PrezVocabBase");
  }
  constructor() {
    super(...arguments), this.vocab = null, this.vocabUrl = null, this.baseUrl = null, this.disabled = !1, this.lang = "en", this.theme = "auto", this.loading = !1, this.error = null, this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map();
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
      this.vocabData = await Be(e), this.conceptMap = new Map(this.vocabData.concepts.map((r) => [r.iri, r])), this.dispatchEvent(new CustomEvent("prez-load", {
        bubbles: !0,
        composed: !0,
        detail: {
          vocab: this.vocab,
          url: e,
          conceptCount: this.vocabData.concepts.length
        }
      }));
    } catch (r) {
      this.error = r instanceof Error ? r.message : "Failed to load vocabulary", this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map(), this.dispatchEvent(new CustomEvent("prez-error", {
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
        concepts: Array.isArray(e) ? e.map((r) => this.conceptMap.get(r)).filter(Boolean) : this.conceptMap.get(e) || null
      }
    }));
  }
  /** Emit expand/collapse event */
  emitExpand(e, r) {
    this.dispatchEvent(new CustomEvent("prez-expand", {
      bubbles: !0,
      composed: !0,
      detail: {
        iri: e,
        expanded: r,
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
$([
  b({ type: String })
], g.prototype, "vocab");
$([
  b({ type: String, attribute: "vocab-url" })
], g.prototype, "vocabUrl");
$([
  b({ type: String, attribute: "base-url" })
], g.prototype, "baseUrl");
$([
  b({ type: Boolean, reflect: !0 })
], g.prototype, "disabled");
$([
  b({ type: String })
], g.prototype, "lang");
$([
  b({ type: String, reflect: !0 })
], g.prototype, "theme");
$([
  C()
], g.prototype, "loading");
$([
  C()
], g.prototype, "error");
$([
  C()
], g.prototype, "vocabData");
$([
  C()
], g.prototype, "conceptMap");
var Je = Object.defineProperty, Ze = Object.getOwnPropertyDescriptor, m = /* @__PURE__ */ d((t, e, r, i) => {
  for (var s = i > 1 ? void 0 : i ? Ze(e, r) : e, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (s = (i ? a(e, r, s) : a(s)) || s);
  return i && s && Je(e, r, s), s;
}, "__decorateClass");
let v = class extends g {
  static {
    d(this, "PrezList");
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
        const t = /* @__PURE__ */ new Set(), e = /* @__PURE__ */ d((r) => {
          for (const i of r)
            i.children.length > 0 && (t.add(i.iri), e(i.children));
        }, "collectIris");
        e(this.vocabData.tree), this.expandedNodes = t;
      } else if (this.maxLevel > 0) {
        const t = /* @__PURE__ */ new Set(), e = /* @__PURE__ */ d((r, i) => {
          if (!(i <= 0))
            for (const s of r)
              s.children.length > 0 && (t.add(s.iri), e(s.children, i - 1));
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
    const r = new Set(this.expandedNodes), i = r.has(t);
    i ? r.delete(t) : r.add(t), this.expandedNodes = r, this.emitExpand(t, !i);
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
      const e = this.values.includes(t) ? this.values.filter((r) => r !== t) : [...this.values, t];
      this.values = e, this.emitChange(e);
    } else
      this.value = t, this.emitChange(t), this.type === "dropdown" && (this.dropdownOpen = !1, this.filterText = "");
  }
  handleSelectChange(t) {
    const e = t.target;
    if (this.multiple) {
      const r = Array.from(e.selectedOptions).map((i) => i.value);
      this.values = r, this.emitChange(r);
    } else {
      const r = e.value || null;
      this.value = r, this.emitChange(r || "");
    }
  }
  countDescendants(t) {
    let e = t.children.length;
    for (const r of t.children)
      e += this.countDescendants(r);
    return e;
  }
  collectDescendantIris(t) {
    const e = [t.iri];
    for (const r of t.children)
      e.push(...this.collectDescendantIris(r));
    return e;
  }
  selectNodeWithDescendants(t, e) {
    e.stopPropagation(), e.preventDefault();
    const r = this.collectDescendantIris(t), i = this.values.includes(t.iri);
    let s;
    if (i)
      s = this.values.filter((o) => !r.includes(o));
    else {
      const o = r.filter((a) => !this.values.includes(a));
      s = [...this.values, ...o];
    }
    this.values = s, this.emitChange(s);
  }
  get filteredConcepts() {
    if (!this.vocabData?.concepts) return [];
    let t = this.vocabData.concepts;
    if (this.filterText) {
      const e = this.filterText.toLowerCase();
      t = t.filter(
        (r) => r.label.toLowerCase().includes(e) || r.notation?.toLowerCase().includes(e) || r.altLabels?.some((i) => i.toLowerCase().includes(e))
      );
    }
    return [...t].sort((e, r) => e.label.localeCompare(r.label));
  }
  filterTreeNodes(t) {
    if (!this.filterText) return t;
    const e = this.filterText.toLowerCase(), r = /* @__PURE__ */ d((s) => s.label.toLowerCase().includes(e) || s.notation?.toLowerCase().includes(e), "matchesFilter"), i = /* @__PURE__ */ d((s) => {
      const o = s.children.map(i).filter((a) => a !== null);
      return r(s) || o.length > 0 ? { ...s, children: o } : null;
    }, "filterNode");
    return t.map(i).filter((s) => s !== null);
  }
  renderTreeNode(t) {
    const e = t.children.length > 0, r = this.expandedNodes.has(t.iri) || this.filterText && e, i = this.multiple ? this.values.includes(t.iri) : this.value === t.iri;
    return n`
      <li class="tree-item">
        <div
          class="tree-row ${this.showSelected && i ? "selected" : ""}"
          @click=${() => this.selectNode(t.iri)}
        >
          ${e ? n`
            <button
              class="expand-btn"
              @click=${(s) => this.toggleExpand(t.iri, s)}
              aria-expanded=${r}
              aria-label=${r ? "Collapse" : "Expand"}
            >
              ${r ? n`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 3 L5 7 L9 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : n`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1 L7 5 L3 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
            </button>
          ` : n`<span class="expand-placeholder"></span>`}
          ${this.multiple ? n`
            <input
              type="checkbox"
              class="checkbox"
              .checked=${i}
              @click=${(s) => {
      s.stopPropagation(), this.selectNode(t.iri);
    }}
              @dblclick=${(s) => this.selectNodeWithDescendants(t, s)}
              title="Double-click to select/deselect with all children"
            >
          ` : l}
          ${t.notation ? n`<span class="notation">${t.notation}</span>` : l}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? n`
              <span class="description">${t.description}</span>
            ` : l}
          </div>
          ${this.showCount && e ? n`
            <span class="count">(${this.countDescendants(t)})</span>
          ` : l}
        </div>
        ${e && r ? n`
          <ul class="children">
            ${t.children.map((s) => this.renderTreeNode(s))}
          </ul>
        ` : l}
      </li>
    `;
  }
  findNodePath(t, e = this.vocabData?.tree || [], r = []) {
    for (const i of e) {
      const s = [...r, i.label];
      if (i.iri === t)
        return s;
      if (i.children.length > 0) {
        const o = this.findNodePath(t, i.children, s);
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
          const r = this.findNodePath(e);
          if (r) return r.join(" > ");
        }
        return this.vocabData?.concepts.find((r) => r.iri === e)?.label || e;
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
      return e.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : n`
        ${this.renderSelectControls()}
        <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || "Vocabulary list"}>
          ${e.map((r) => {
        const i = this.multiple ? this.values.includes(r.iri) : this.value === r.iri;
        return n`
              <li class="flat-item">
                <div
                  class="tree-row ${this.showSelected && i ? "selected" : ""}"
                  role="option"
                  aria-selected=${i}
                  @click=${() => this.selectNode(r.iri)}
                >
                  ${this.multiple ? n`
                    <input
                      type="checkbox"
                      class="checkbox"
                      .checked=${i}
                      @click=${(s) => {
          s.stopPropagation(), this.selectNode(r.iri);
        }}
                    >
                  ` : l}
                  ${r.notation ? n`<span class="notation">${r.notation}</span>` : l}
                  <div class="item-content">
                    <span class="label">${r.label}</span>
                    ${this.showDescription && r.description ? n`
                      <span class="description">${r.description}</span>
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
    return t.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : n`
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
    return this.search ? n`
        <div class="dropdown">
          <div class="dropdown-trigger ${this.dropdownOpen ? "open" : ""}">
            <input
              type="text"
              class="dropdown-search-input"
              .value=${this.filterText}
              placeholder=${e ? t : this.placeholder}
              @focus=${this.handleSearchFocus}
              @input=${this.handleSearchInput}
              @click=${(r) => r.stopPropagation()}
              aria-haspopup="listbox"
              aria-expanded=${this.dropdownOpen}
            />
            <svg class="dropdown-trigger-icon" viewBox="0 0 20 20" fill="currentColor" @click=${this.toggleDropdown}>
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </div>
          ${this.dropdownOpen ? n`
            <div class="dropdown-popover">
              ${this.renderDropdownContent()}
              ${this.multiple && this.values.length > 0 ? n`
                <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid var(--prez-divider);">
                  ${this.values.length} selected
                </div>
              ` : l}
            </div>
          ` : l}
        </div>
      ` : n`
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
        ${this.dropdownOpen ? n`
          <div class="dropdown-popover">
            ${this.renderDropdownContent()}
            ${this.multiple && this.values.length > 0 ? n`
              <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid var(--prez-divider);">
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
    return n`
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
    return t.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : n`
      ${this.renderSelectControls()}
      <ul class="tree" role="tree" aria-label=${this.vocabData?.label || "Vocabulary tree"}>
        ${t.map((e) => this.renderTreeNode(e))}
      </ul>
      ${this.multiple && this.values.length > 0 ? n`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : l}
    `;
  }
  renderRadioNode(t, e) {
    const r = t.children.length > 0, i = t.children.length > 1, s = this.value === t.iri, o = `radio-${this.vocab || "vocab"}`, a = this.horizontal && i && !e;
    return n`
      <div class="radio-node">
        <label class="radio-item">
          <input
            type="radio"
            name=${o}
            .checked=${s}
            @change=${() => this.selectRadio(t.iri)}
          />
          ${t.notation ? n`<span class="notation">${t.notation}</span>` : l}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? n`
              <span class="description">${t.description}</span>
            ` : l}
          </div>
        </label>
        ${r ? n`
          <div class="radio-children ${this.horizontal ? "horizontal" : ""} ${a ? "with-separator" : ""}">
            ${t.children.map((p, c) => {
      const h = e && c === t.children.length - 1;
      return this.renderRadioNode(p, h);
    })}
          </div>
        ` : l}
      </div>
    `;
  }
  renderRadio() {
    const t = this.filterTreeNodes(this.vocabData?.tree || []);
    return t.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : n`
      <div class="radio-group" role="radiogroup" aria-label=${this.vocabData?.label || "Vocabulary selection"}>
        <div class="radio-level ${this.horizontal ? "horizontal" : ""}">
          ${t.map((e, r) => this.renderRadioNode(e, r === t.length - 1))}
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
    const r = this.multiple ? this.values.includes(t.iri) : this.value === t.iri, i = this.tableFields;
    return n`
      <tr
        class="${r ? "selected" : ""}"
        @click=${() => this.selectNode(t.iri)}
        style="cursor: pointer"
      >
        ${this.multiple ? n`
          <td class="cell-checkbox">
            <input
              type="checkbox"
              .checked=${r}
              @click=${(s) => {
      s.stopPropagation(), this.selectNode(t.iri);
    }}
            />
          </td>
        ` : l}
        ${i.map((s, o) => n`
          <td class="${s === "iri" ? "cell-iri" : s === "description" ? "cell-description" : ""}">
            ${o === 0 && !this.flat && e > 0 ? n`
              <div class="cell-indent">
                ${Array(e).fill(0).map(() => n`<span class="indent-spacer"></span>`)}
                <span>${this.getFieldValue(t, s)}</span>
              </div>
            ` : this.getFieldValue(t, s)}
          </td>
        `)}
      </tr>
    `;
  }
  renderTableTreeRows(t, e = 0) {
    const r = this.conceptMap.get(t.iri);
    if (!r) return [];
    const i = [this.renderTableRow(r, e)];
    for (const s of t.children)
      i.push(...this.renderTableTreeRows(s, e + 1));
    return i;
  }
  renderTable() {
    const t = this.tableFields;
    if (this.flat) {
      const r = this.filteredConcepts;
      return r.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : n`
        ${this.renderSelectControls()}
        <table class="vocab-table">
          <thead>
            <tr>
              ${this.multiple ? n`<th class="cell-checkbox"></th>` : l}
              ${t.map((i) => n`<th>${this.getFieldLabel(i)}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${r.map((i) => this.renderTableRow(i, 0))}
          </tbody>
        </table>
        ${this.multiple && this.values.length > 0 ? n`
          <div class="selection-count">
            ${this.values.length} selected
          </div>
        ` : l}
      `;
    }
    const e = this.filterTreeNodes(this.vocabData?.tree || []);
    return e.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : n`
      ${this.renderSelectControls()}
      <table class="vocab-table">
        <thead>
          <tr>
            ${this.multiple ? n`<th class="cell-checkbox"></th>` : l}
            ${t.map((r) => n`<th>${this.getFieldLabel(r)}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${e.flatMap((r) => this.renderTableTreeRows(r, 0))}
        </tbody>
      </table>
      ${this.multiple && this.values.length > 0 ? n`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : l}
    `;
  }
  renderFlatItem(t) {
    const e = this.multiple ? this.values.includes(t.iri) : this.value === t.iri;
    if (this.type === "radio") {
      const r = `radio-${this.vocab || "vocab"}`;
      return n`
        <div class="radio-node">
          <label class="radio-item">
            <input
              type="radio"
              name=${r}
              .checked=${e}
              @change=${() => this.selectRadio(t.iri)}
            />
            ${t.notation ? n`<span class="notation">${t.notation}</span>` : l}
            <div class="item-content">
              <span class="label">${t.label}</span>
              ${this.showDescription && t.description ? n`
                <span class="description">${t.description}</span>
              ` : l}
            </div>
          </label>
        </div>
      `;
    }
    return n`
      <li class="flat-item">
        <div
          class="tree-row ${this.showSelected && e ? "selected" : ""}"
          role="option"
          aria-selected=${e}
          @click=${() => this.selectNode(t.iri)}
        >
          ${this.multiple ? n`
            <input
              type="checkbox"
              class="checkbox"
              .checked=${e}
              @click=${(r) => {
      r.stopPropagation(), this.selectNode(t.iri);
    }}
            >
          ` : l}
          ${t.notation ? n`<span class="notation">${t.notation}</span>` : l}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? n`
              <span class="description">${t.description}</span>
            ` : l}
          </div>
        </div>
      </li>
    `;
  }
  renderFlatList() {
    const t = this.filteredConcepts;
    return t.length === 0 ? n`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : this.type === "radio" ? n`
        <div class="radio-group" role="radiogroup" aria-label=${this.vocabData?.label || "Vocabulary selection"}>
          <div class="radio-level ${this.horizontal ? "horizontal" : ""}">
            ${t.map((e) => this.renderFlatItem(e))}
          </div>
        </div>
      ` : n`
      ${this.renderSelectControls()}
      <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || "Vocabulary list"}>
        ${t.map((e) => this.renderFlatItem(e))}
      </ul>
      ${this.multiple && this.values.length > 0 ? n`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : l}
    `;
  }
  render() {
    return this.loading ? n`<div class="loading">Loading vocabulary...</div>` : this.error ? n`<div class="error">${this.error}</div>` : this.vocabData ? this.type === "dropdown" ? this.renderDropdown() : this.type === "radio" ? n`
        ${this.search ? n`
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
      ` : this.type === "table" ? n`
        ${this.search ? n`
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
      ` : n`
      ${this.search ? n`
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
    ` : n`<div class="loading">No vocabulary specified</div>`;
  }
};
v.styles = be`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      background: var(--prez-bg);
      color: var(--prez-text);
      padding: 0.5rem;
      border-radius: 0.375rem;

      /* Light mode colors (default) */
      --prez-bg: #ffffff;
      --prez-border: #d1d5db;
      --prez-border-hover: #9ca3af;
      --prez-border-focus: #3b82f6;
      --prez-focus-ring: rgba(59, 130, 246, 0.2);
      --prez-text: #374151;
      --prez-text-muted: #6b7280;
      --prez-text-placeholder: #9ca3af;
      --prez-text-error: #ef4444;
      --prez-hover-bg: #f3f4f6;
      --prez-selected-bg: #dbeafe;
      --prez-selected-hover-bg: #bfdbfe;
      --prez-table-header-bg: #f9fafb;
      --prez-divider: #e5e7eb;
      --prez-shadow: rgba(0, 0, 0, 0.1);
      --prez-shadow-sm: rgba(0, 0, 0, 0.06);
      --prez-primary: #3b82f6;
      --prez-primary-hover: #eff6ff;
    }

    /* Dark mode - system preference */
    @media (prefers-color-scheme: dark) {
      :host([theme="auto"]) {
        --prez-bg: #1f2937;
        --prez-border: #4b5563;
        --prez-border-hover: #6b7280;
        --prez-border-focus: #60a5fa;
        --prez-focus-ring: rgba(96, 165, 250, 0.3);
        --prez-text: #f3f4f6;
        --prez-text-muted: #9ca3af;
        --prez-text-placeholder: #6b7280;
        --prez-text-error: #f87171;
        --prez-hover-bg: #374151;
        --prez-selected-bg: #2563eb;
        --prez-selected-hover-bg: #3b82f6;
        --prez-table-header-bg: #111827;
        --prez-divider: #374151;
        --prez-shadow: rgba(0, 0, 0, 0.3);
        --prez-shadow-sm: rgba(0, 0, 0, 0.2);
        --prez-primary: #60a5fa;
        --prez-primary-hover: #1e3a5f;
      }
    }

    /* Dark mode - explicit override */
    :host([theme="dark"]) {
      --prez-bg: #1f2937;
      --prez-border: #4b5563;
      --prez-border-hover: #6b7280;
      --prez-border-focus: #60a5fa;
      --prez-focus-ring: rgba(96, 165, 250, 0.3);
      --prez-text: #f3f4f6;
      --prez-text-muted: #9ca3af;
      --prez-text-placeholder: #6b7280;
      --prez-text-error: #f87171;
      --prez-hover-bg: #374151;
      --prez-selected-bg: #2563eb;
      --prez-selected-hover-bg: #3b82f6;
      --prez-table-header-bg: #111827;
      --prez-divider: #374151;
      --prez-shadow: rgba(0, 0, 0, 0.3);
      --prez-shadow-sm: rgba(0, 0, 0, 0.2);
      --prez-primary: #60a5fa;
      --prez-primary-hover: #1e3a5f;
    }

    /* Light mode - explicit override (redundant but explicit for clarity) */
    :host([theme="light"]) {
      --prez-bg: #ffffff;
      --prez-border: #d1d5db;
      --prez-border-hover: #9ca3af;
      --prez-border-focus: #3b82f6;
      --prez-focus-ring: rgba(59, 130, 246, 0.2);
      --prez-text: #374151;
      --prez-text-muted: #6b7280;
      --prez-text-placeholder: #9ca3af;
      --prez-text-error: #ef4444;
      --prez-hover-bg: #f3f4f6;
      --prez-selected-bg: #dbeafe;
      --prez-selected-hover-bg: #bfdbfe;
      --prez-table-header-bg: #f9fafb;
      --prez-divider: #e5e7eb;
      --prez-shadow: rgba(0, 0, 0, 0.1);
      --prez-shadow-sm: rgba(0, 0, 0, 0.06);
      --prez-primary: #3b82f6;
      --prez-primary-hover: #eff6ff;
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
      border: 1px solid var(--prez-border);
      border-radius: 0.375rem;
      background: var(--prez-bg);
      font-size: 0.875rem;
      cursor: pointer;
      text-align: left;
      gap: 0.5rem;
    }

    .dropdown-trigger:hover {
      border-color: var(--prez-border-hover);
    }

    .dropdown-trigger:focus {
      outline: none;
      border-color: var(--prez-border-focus);
      box-shadow: 0 0 0 2px var(--prez-focus-ring);
    }

    .dropdown-trigger.open {
      border-color: var(--prez-border-focus);
      box-shadow: 0 0 0 2px var(--prez-focus-ring);
    }

    .dropdown-trigger-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--prez-text);
    }

    .dropdown-trigger-placeholder {
      color: var(--prez-text-placeholder);
    }

    .dropdown-trigger-icon {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--prez-text-muted);
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
      color: var(--prez-text);
    }

    .dropdown-search-input::placeholder {
      color: var(--prez-text-muted);
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
      background: var(--prez-bg);
      border: 1px solid var(--prez-border);
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px var(--prez-shadow), 0 2px 4px -1px var(--prez-shadow-sm);
      z-index: 50;
      max-height: 300px;
      overflow-y: auto;
    }

    .dropdown-popover .tree {
      padding: 0.25rem;
    }

    .dropdown-popover .search {
      padding: 0.5rem;
      border-bottom: 1px solid var(--prez-divider);
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
      border: 1px solid var(--prez-border);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      box-sizing: border-box;
      background: var(--prez-bg);
      color: var(--prez-text);
    }

    .search input::placeholder {
      color: var(--prez-text-placeholder);
    }

    .search input:focus {
      outline: none;
      border-color: var(--prez-border-focus);
      box-shadow: 0 0 0 2px var(--prez-focus-ring);
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
      background: var(--prez-divider);
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
      background-color: var(--prez-hover-bg);
    }

    .tree-row.selected {
      background-color: var(--prez-selected-bg);
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
      color: var(--prez-text-muted);
      padding: 0;
      flex-shrink: 0;
      transition: background-color 0.15s, color 0.15s;
    }

    .expand-btn:hover {
      background: var(--prez-divider);
      color: var(--prez-text);
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
      color: var(--prez-text-muted);
      font-size: 0.75rem;
    }

    .count {
      color: var(--prez-text-muted);
      font-size: 0.75rem;
    }

    .children {
      list-style: none;
      padding-left: 1.25rem;
      margin: 0;
    }

    /* Status styles */
    .loading {
      color: var(--prez-text-muted);
      padding: 0.5rem;
    }

    .error {
      color: var(--prez-text-error);
      font-size: 0.75rem;
      padding: 0.25rem;
    }

    .empty {
      color: var(--prez-text-muted);
      padding: 0.5rem;
    }

    .selection-count {
      font-size: 0.75rem;
      color: var(--prez-text-muted);
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
      border-bottom: 1px solid var(--prez-divider);
    }

    .radio-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .radio-item:hover {
      color: var(--prez-primary);
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
      color: var(--prez-text-muted);
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
      border-bottom: 1px solid var(--prez-divider);
    }

    .select-controls button {
      font-size: 0.75rem;
      color: var(--prez-primary);
      background: none;
      border: none;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }

    .select-controls button:hover:not(:disabled) {
      background: var(--prez-primary-hover);
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
      border-bottom: 2px solid var(--prez-divider);
      font-weight: 600;
      color: var(--prez-text);
      background: var(--prez-table-header-bg);
    }

    .vocab-table td {
      padding: 0.5rem;
      border-bottom: 1px solid var(--prez-divider);
      vertical-align: top;
    }

    .vocab-table tr:hover {
      background: var(--prez-table-header-bg);
    }

    .vocab-table tr.selected {
      background: var(--prez-selected-bg);
    }

    .vocab-table tr.selected:hover {
      background: var(--prez-selected-hover-bg);
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
      color: var(--prez-text-muted);
      word-break: break-all;
    }

    .vocab-table .cell-description {
      color: var(--prez-text-muted);
      font-size: 0.8125rem;
    }
  `;
m([
  b({ type: String })
], v.prototype, "type", 2);
m([
  b({ type: String })
], v.prototype, "fields", 2);
m([
  b({ type: Boolean })
], v.prototype, "multiple", 2);
m([
  b({ type: Boolean })
], v.prototype, "flat", 2);
m([
  b({ type: Boolean })
], v.prototype, "horizontal", 2);
m([
  b({ type: Boolean })
], v.prototype, "search", 2);
m([
  b({ type: Number, attribute: "max-level" })
], v.prototype, "maxLevel", 2);
m([
  b({ type: Boolean, attribute: "show-selected" })
], v.prototype, "showSelected", 2);
m([
  b({ type: String })
], v.prototype, "placeholder", 2);
m([
  b({ type: String })
], v.prototype, "value", 2);
m([
  b({ type: Array, attribute: "values" })
], v.prototype, "values", 2);
m([
  b({ type: Boolean, attribute: "show-count" })
], v.prototype, "showCount", 2);
m([
  b({ type: Boolean, attribute: "show-description" })
], v.prototype, "showDescription", 2);
m([
  b({ type: Boolean, attribute: "show-iri" })
], v.prototype, "showIri", 2);
m([
  C()
], v.prototype, "filterText", 2);
m([
  C()
], v.prototype, "expandedNodes", 2);
m([
  C()
], v.prototype, "dropdownOpen", 2);
v = m([
  Ue("prez-list")
], v);
export {
  v as PrezList,
  g as PrezVocabBase,
  Xe as clearCache,
  Ve as detectBaseUrl,
  Be as fetchVocab,
  We as resolveVocabUrl
};
