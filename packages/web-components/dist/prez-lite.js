var xe = Object.defineProperty;
var l = (t, e) => xe(t, "name", { value: e, configurable: !0 });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const q = globalThis, X = q.ShadowRoot && (q.ShadyCSS === void 0 || q.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Z = Symbol(), ie = /* @__PURE__ */ new WeakMap();
let be = class {
  static {
    l(this, "n");
  }
  constructor(e, r, i) {
    if (this._$cssResult$ = !0, i !== Z) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = r;
  }
  get styleSheet() {
    let e = this.o;
    const r = this.t;
    if (X && e === void 0) {
      const i = r !== void 0 && r.length === 1;
      i && (e = ie.get(r)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && ie.set(r, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const _e = /* @__PURE__ */ l((t) => new be(typeof t == "string" ? t : t + "", void 0, Z), "r$4"), ze = /* @__PURE__ */ l((t, ...e) => {
  const r = t.length === 1 ? t[0] : e.reduce((i, s, o) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + t[o + 1], t[0]);
  return new be(r, t, Z);
}, "i$3"), Ae = /* @__PURE__ */ l((t, e) => {
  if (X) t.adoptedStyleSheets = e.map((r) => r instanceof CSSStyleSheet ? r : r.styleSheet);
  else for (const r of e) {
    const i = document.createElement("style"), s = q.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = r.cssText, t.appendChild(i);
  }
}, "S$1"), se = X ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let r = "";
  for (const i of e.cssRules) r += i.cssText;
  return _e(r);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Se, defineProperty: Ce, getOwnPropertyDescriptor: Ee, getOwnPropertyNames: Te, getOwnPropertySymbols: Ne, getPrototypeOf: ke } = Object, B = globalThis, oe = B.trustedTypes, De = oe ? oe.emptyScript : "", Pe = B.reactiveElementPolyfillSupport, P = /* @__PURE__ */ l((t, e) => t, "d$1"), H = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? De : null;
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
} }, K = /* @__PURE__ */ l((t, e) => !Se(t, e), "f$1"), ne = { attribute: !0, type: String, converter: H, reflect: !1, useDefault: !1, hasChanged: K };
Symbol.metadata ??= Symbol("metadata"), B.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let T = class extends HTMLElement {
  static {
    l(this, "y");
  }
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, r = ne) {
    if (r.state && (r.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((r = Object.create(r)).wrapped = !0), this.elementProperties.set(e, r), !r.noAccessor) {
      const i = Symbol(), s = this.getPropertyDescriptor(e, i, r);
      s !== void 0 && Ce(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, r, i) {
    const { get: s, set: o } = Ee(this.prototype, e) ?? { get() {
      return this[r];
    }, set(n) {
      this[r] = n;
    } };
    return { get: s, set(n) {
      const c = s?.call(this);
      o?.call(this, n), this.requestUpdate(e, c, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ne;
  }
  static _$Ei() {
    if (this.hasOwnProperty(P("elementProperties"))) return;
    const e = ke(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(P("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(P("properties"))) {
      const r = this.properties, i = [...Te(r), ...Ne(r)];
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
      for (const s of i) r.unshift(se(s));
    } else e !== void 0 && r.push(se(e));
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
    return Ae(e, this.constructor.elementStyles), e;
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
      const o = i.getPropertyOptions(s), n = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : H;
      this._$Em = s;
      const c = n.fromAttribute(r, o.type);
      this[s] = c ?? this._$Ej?.get(s) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, r, i, s = !1, o) {
    if (e !== void 0) {
      const n = this.constructor;
      if (s === !1 && (o = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? K)(o, r) || i.useDefault && i.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, r, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, r, { useDefault: i, reflect: s, wrapped: o }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? r ?? this[e]), o !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (r = void 0), this._$AL.set(e, r)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        const { wrapped: n } = o, c = this[s];
        n !== !0 || this._$AL.has(s) || c === void 0 || this.C(s, void 0, o, c);
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
T.elementStyles = [], T.shadowRootOptions = { mode: "open" }, T[P("elementProperties")] = /* @__PURE__ */ new Map(), T[P("finalized")] = /* @__PURE__ */ new Map(), Pe?.({ ReactiveElement: T }), (B.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ee = globalThis, ae = /* @__PURE__ */ l((t) => t, "i$1"), j = ee.trustedTypes, le = j ? j.createPolicy("lit-html", { createHTML: /* @__PURE__ */ l((t) => t, "createHTML") }) : void 0, me = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, ve = "?" + _, Le = `<${ve}>`, E = document, O = /* @__PURE__ */ l(() => E.createComment(""), "c"), M = /* @__PURE__ */ l((t) => t === null || typeof t != "object" && typeof t != "function", "a"), te = Array.isArray, Oe = /* @__PURE__ */ l((t) => te(t) || typeof t?.[Symbol.iterator] == "function", "d"), Q = `[ 	
\f\r]`, D = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ce = /-->/g, de = />/g, S = RegExp(`>|${Q}(?:([^\\s"'>=/]+)(${Q}*=${Q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), he = /'/g, pe = /"/g, ge = /^(?:script|style|textarea|title)$/i, Me = /* @__PURE__ */ l((t) => (e, ...r) => ({ _$litType$: t, strings: e, values: r }), "x"), a = Me(1), N = Symbol.for("lit-noChange"), d = Symbol.for("lit-nothing"), ue = /* @__PURE__ */ new WeakMap(), C = E.createTreeWalker(E, 129);
function $e(t, e) {
  if (!te(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return le !== void 0 ? le.createHTML(e) : e;
}
l($e, "V");
const Re = /* @__PURE__ */ l((t, e) => {
  const r = t.length - 1, i = [];
  let s, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = D;
  for (let c = 0; c < r; c++) {
    const h = t[c];
    let p, u, b = -1, y = 0;
    for (; y < h.length && (n.lastIndex = y, u = n.exec(h), u !== null); ) y = n.lastIndex, n === D ? u[1] === "!--" ? n = ce : u[1] !== void 0 ? n = de : u[2] !== void 0 ? (ge.test(u[2]) && (s = RegExp("</" + u[2], "g")), n = S) : u[3] !== void 0 && (n = S) : n === S ? u[0] === ">" ? (n = s ?? D, b = -1) : u[1] === void 0 ? b = -2 : (b = n.lastIndex - u[2].length, p = u[1], n = u[3] === void 0 ? S : u[3] === '"' ? pe : he) : n === pe || n === he ? n = S : n === ce || n === de ? n = D : (n = S, s = void 0);
    const x = n === S && t[c + 1].startsWith("/>") ? " " : "";
    o += n === D ? h + Le : b >= 0 ? (i.push(p), h.slice(0, b) + me + h.slice(b) + _ + x) : h + _ + (b === -2 ? c : x);
  }
  return [$e(t, o + (t[r] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
}, "N");
class R {
  static {
    l(this, "S");
  }
  constructor({ strings: e, _$litType$: r }, i) {
    let s;
    this.parts = [];
    let o = 0, n = 0;
    const c = e.length - 1, h = this.parts, [p, u] = Re(e, r);
    if (this.el = R.createElement(p, i), C.currentNode = this.el.content, r === 2 || r === 3) {
      const b = this.el.content.firstChild;
      b.replaceWith(...b.childNodes);
    }
    for (; (s = C.nextNode()) !== null && h.length < c; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const b of s.getAttributeNames()) if (b.endsWith(me)) {
          const y = u[n++], x = s.getAttribute(b).split(_), U = /([.?@])?(.*)/.exec(y);
          h.push({ type: 1, index: o, name: U[2], strings: x, ctor: U[1] === "." ? Ue : U[1] === "?" ? qe : U[1] === "@" ? He : V }), s.removeAttribute(b);
        } else b.startsWith(_) && (h.push({ type: 6, index: o }), s.removeAttribute(b));
        if (ge.test(s.tagName)) {
          const b = s.textContent.split(_), y = b.length - 1;
          if (y > 0) {
            s.textContent = j ? j.emptyScript : "";
            for (let x = 0; x < y; x++) s.append(b[x], O()), C.nextNode(), h.push({ type: 2, index: ++o });
            s.append(b[y], O());
          }
        }
      } else if (s.nodeType === 8) if (s.data === ve) h.push({ type: 2, index: o });
      else {
        let b = -1;
        for (; (b = s.data.indexOf(_, b + 1)) !== -1; ) h.push({ type: 7, index: o }), b += _.length - 1;
      }
      o++;
    }
  }
  static createElement(e, r) {
    const i = E.createElement("template");
    return i.innerHTML = e, i;
  }
}
function k(t, e, r = t, i) {
  if (e === N) return e;
  let s = i !== void 0 ? r._$Co?.[i] : r._$Cl;
  const o = M(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== o && (s?._$AO?.(!1), o === void 0 ? s = void 0 : (s = new o(t), s._$AT(t, r, i)), i !== void 0 ? (r._$Co ??= [])[i] = s : r._$Cl = s), s !== void 0 && (e = k(t, s._$AS(t, e.values), s, i)), e;
}
l(k, "M");
class Ie {
  static {
    l(this, "R");
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
    const { el: { content: r }, parts: i } = this._$AD, s = (e?.creationScope ?? E).importNode(r, !0);
    C.currentNode = s;
    let o = C.nextNode(), n = 0, c = 0, h = i[0];
    for (; h !== void 0; ) {
      if (n === h.index) {
        let p;
        h.type === 2 ? p = new I(o, o.nextSibling, this, e) : h.type === 1 ? p = new h.ctor(o, h.name, h.strings, this, e) : h.type === 6 && (p = new je(o, this, e)), this._$AV.push(p), h = i[++c];
      }
      n !== h?.index && (o = C.nextNode(), n++);
    }
    return C.currentNode = E, s;
  }
  p(e) {
    let r = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, r), r += i.strings.length - 2) : i._$AI(e[r])), r++;
  }
}
class I {
  static {
    l(this, "k");
  }
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, r, i, s) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = e, this._$AB = r, this._$AM = i, this.options = s, this._$Cv = s?.isConnected ?? !0;
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
    e = k(this, e, r), M(e) ? e === d || e == null || e === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : e !== this._$AH && e !== N && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Oe(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== d && M(this._$AH) ? this._$AA.nextSibling.data = e : this.T(E.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: r, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = R.createElement($e(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(r);
    else {
      const o = new Ie(s, this), n = o.u(this.options);
      o.p(r), this.T(n), this._$AH = o;
    }
  }
  _$AC(e) {
    let r = ue.get(e.strings);
    return r === void 0 && ue.set(e.strings, r = new R(e)), r;
  }
  k(e) {
    te(this._$AH) || (this._$AH = [], this._$AR());
    const r = this._$AH;
    let i, s = 0;
    for (const o of e) s === r.length ? r.push(i = new I(this.O(O()), this.O(O()), this, this.options)) : i = r[s], i._$AI(o), s++;
    s < r.length && (this._$AR(i && i._$AB.nextSibling, s), r.length = s);
  }
  _$AR(e = this._$AA.nextSibling, r) {
    for (this._$AP?.(!1, !0, r); e !== this._$AB; ) {
      const i = ae(e).nextSibling;
      ae(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class V {
  static {
    l(this, "H");
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, r, i, s, o) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = e, this.name = r, this._$AM = s, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = d;
  }
  _$AI(e, r = this, i, s) {
    const o = this.strings;
    let n = !1;
    if (o === void 0) e = k(this, e, r, 0), n = !M(e) || e !== this._$AH && e !== N, n && (this._$AH = e);
    else {
      const c = e;
      let h, p;
      for (e = o[0], h = 0; h < o.length - 1; h++) p = k(this, c[i + h], r, h), p === N && (p = this._$AH[h]), n ||= !M(p) || p !== this._$AH[h], p === d ? e = d : e !== d && (e += (p ?? "") + o[h + 1]), this._$AH[h] = p;
    }
    n && !s && this.j(e);
  }
  j(e) {
    e === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ue extends V {
  static {
    l(this, "I");
  }
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === d ? void 0 : e;
  }
}
class qe extends V {
  static {
    l(this, "L");
  }
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== d);
  }
}
class He extends V {
  static {
    l(this, "z");
  }
  constructor(e, r, i, s, o) {
    super(e, r, i, s, o), this.type = 5;
  }
  _$AI(e, r = this) {
    if ((e = k(this, e, r, 0) ?? d) === N) return;
    const i = this._$AH, s = e === d && i !== d || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, o = e !== d && (i === d || s);
    s && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class je {
  static {
    l(this, "Z");
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
const Fe = ee.litHtmlPolyfillSupport;
Fe?.(R, I), (ee.litHtmlVersions ??= []).push("3.3.2");
const Be = /* @__PURE__ */ l((t, e, r) => {
  const i = r?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const o = r?.renderBefore ?? null;
    i._$litPart$ = s = new I(e.insertBefore(O(), o), o, void 0, r ?? {});
  }
  return s._$AI(t), s;
}, "D");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const re = globalThis;
class L extends T {
  static {
    l(this, "i");
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Be(r, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return N;
  }
}
L._$litElement$ = !0, L.finalized = !0, re.litElementHydrateSupport?.({ LitElement: L });
const Ve = re.litElementPolyfillSupport;
Ve?.({ LitElement: L });
(re.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const We = /* @__PURE__ */ l((t) => (e, r) => {
  r !== void 0 ? r.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
}, "t");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ge = { attribute: !0, type: String, converter: H, reflect: !1, hasChanged: K }, Ye = /* @__PURE__ */ l((t = Ge, e, r) => {
  const { kind: i, metadata: s } = r;
  let o = globalThis.litPropertyMetadata.get(s);
  if (o === void 0 && globalThis.litPropertyMetadata.set(s, o = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), o.set(r.name, t), i === "accessor") {
    const { name: n } = r;
    return { set(c) {
      const h = e.get.call(this);
      e.set.call(this, c), this.requestUpdate(n, h, t, !0, c);
    }, init(c) {
      return c !== void 0 && this.C(n, void 0, t, c), c;
    } };
  }
  if (i === "setter") {
    const { name: n } = r;
    return function(c) {
      const h = this[n];
      e.call(this, c), this.requestUpdate(n, h, t, !0, c);
    };
  }
  throw Error("Unsupported decorator location: " + i);
}, "r$1");
function f(t) {
  return (e, r) => typeof r == "object" ? Ye(t, e, r) : ((i, s, o) => {
    const n = s.hasOwnProperty(o);
    return s.constructor.createProperty(o, i), n ? Object.getOwnPropertyDescriptor(s, o) : void 0;
  })(t, e, r);
}
l(f, "n");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function A(t) {
  return f({ ...t, state: !0, attribute: !1 });
}
l(A, "r");
const F = /* @__PURE__ */ new Map(), Je = 300 * 1e3;
function Qe(t) {
  const e = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  for (const o of t)
    if (e.set(o.iri, o), o.broader)
      for (const n of o.broader) {
        const c = r.get(n) || [];
        c.push(o.iri), r.set(n, c);
      }
  const i = t.filter(
    (o) => !o.broader || o.broader.length === 0 || o.broader.every((n) => !e.has(n))
  );
  function s(o) {
    const n = e.get(o);
    if (!n) return null;
    const h = (r.get(o) || []).map((p) => s(p)).filter((p) => p !== null).sort((p, u) => p.label.localeCompare(u.label));
    return {
      iri: n.iri,
      label: n.label,
      notation: n.notation,
      description: n.description,
      children: h
    };
  }
  return l(s, "buildNode"), i.map((o) => s(o.iri)).filter((o) => o !== null).sort((o, n) => o.label.localeCompare(n.label));
}
l(Qe, "buildTree");
function Xe(t, e) {
  const r = t["@graph"] || [], i = r[0], s = i?.scheme || e, o = i?.schemeLabel || "Vocabulary", n = /* @__PURE__ */ new Map();
  for (const p of r)
    if (p.broader) {
      const u = n.get(p.broader) || [];
      u.push(p.iri), n.set(p.broader, u);
    }
  const c = r.map((p) => ({
    iri: p.iri,
    label: p.prefLabel,
    notation: p.notation,
    description: p.definition,
    // Will be prez:description when export is updated
    altLabels: p.altLabels,
    broader: p.broader ? [p.broader] : void 0,
    narrower: n.get(p.iri)
  })), h = Qe(c);
  return {
    iri: s,
    label: o,
    description: "",
    concepts: c,
    tree: h
  };
}
l(Xe, "transformListJson");
async function Ze(t) {
  const e = F.get(t);
  if (e && Date.now() - e.timestamp < Je)
    return e.data;
  const r = await fetch(t);
  if (!r.ok)
    throw new Error(`Failed to fetch vocabulary: ${r.status} ${r.statusText}`);
  const i = await r.json();
  let s;
  if (i["@graph"])
    s = Xe(i, t);
  else if (i.concepts && Array.isArray(i.concepts))
    s = i;
  else
    throw new Error("Invalid vocabulary format: unrecognized structure");
  return F.set(t, { data: s, timestamp: Date.now() }), s;
}
l(Ze, "fetchVocab");
function bt(t) {
  t ? F.delete(t) : F.clear();
}
l(bt, "clearCache");
function Ke() {
  const t = document.querySelectorAll('script[src*="prez-vocab"]');
  if (t.length > 0) {
    const e = t[t.length - 1].src, r = new URL(e), i = r.pathname.split("/");
    return i.pop(), i.pop(), r.pathname = i.join("/") || "/", r.origin + r.pathname.replace(/\/$/, "");
  }
  return null;
}
l(Ke, "detectBaseUrl");
function et(t, e, r) {
  if (e) return e;
  if (!t) return null;
  const i = r || Ke();
  return i ? `${i}/export/${t}/${t}-list.json` : null;
}
l(et, "resolveVocabUrl");
const tt = [
  "http://www.w3.org/2004/02/skos/core#prefLabel",
  "http://purl.org/dc/terms/title",
  "http://www.w3.org/2000/01/rdf-schema#label"
], rt = [
  "http://www.w3.org/2004/02/skos/core#definition",
  "http://purl.org/dc/terms/description"
], we = {
  "http://www.w3.org/2004/02/skos/core#": "skos:",
  "http://purl.org/dc/terms/": "dcterms:",
  "http://www.w3.org/2000/01/rdf-schema#": "rdfs:",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf:"
};
function it(t) {
  for (const [e, r] of Object.entries(we))
    if (t.startsWith(e))
      return r + t.slice(e.length);
  return `<${t}>`;
}
l(it, "prefixed");
function W(t) {
  const e = /* @__PURE__ */ new Set();
  for (const r of t)
    for (const [i, s] of Object.entries(we))
      r.startsWith(i) && e.add(`PREFIX ${s.slice(0, -1)}: <${i}>`);
  return e.add("PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"), [...e].join(`
`);
}
l(W, "prefixDeclarations");
function z(t, e, r, i) {
  const s = [], o = [];
  e.forEach((c, h) => {
    const p = `?_${r}${h + 1}`;
    o.push(p);
    const u = i ? ` . FILTER(LANG(${p}) = "" || LANG(${p}) = "en")` : "";
    s.push(`  OPTIONAL { ${t} ${it(c)} ${p}${u} }`);
  });
  const n = `  BIND(COALESCE(${o.join(", ")}) AS ?${r})`;
  return [...s, n].join(`
`);
}
l(z, "buildPredicateResolution");
function G(t, e) {
  return e ? `  GRAPH <${e}> {
${t}
  }` : t;
}
l(G, "wrapGraph");
async function Y(t, e, r = 1e4) {
  const i = new AbortController(), s = setTimeout(() => i.abort(), r);
  try {
    const o = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json"
      },
      body: `query=${encodeURIComponent(e)}`,
      signal: i.signal
    });
    if (!o.ok)
      throw new Error(`SPARQL query failed: ${o.status} ${o.statusText}`);
    return await o.json();
  } catch (o) {
    throw o instanceof DOMException && o.name === "AbortError" ? new Error(`SPARQL query timed out after ${r}ms`) : o;
  } finally {
    clearTimeout(s);
  }
}
l(Y, "executeSparql");
function w(t, e) {
  return t[e]?.value;
}
l(w, "getVal");
function st(t, e) {
  const r = t[e]?.value;
  return r ? parseInt(r, 10) : 0;
}
l(st, "getCount");
function ye(t) {
  return t.map((e) => ({
    iri: w(e, "concept"),
    label: w(e, "label") || w(e, "concept").split(/[#/]/).pop() || "",
    notation: w(e, "notation"),
    description: w(e, "definition"),
    children: [],
    hasChildren: st(e, "childCount") > 0,
    childrenLoaded: !1,
    loading: !1
  }));
}
l(ye, "bindingsToNodes");
function J(t) {
  return {
    labels: t.labelPredicates ?? tt,
    descriptions: t.descriptionPredicates ?? rt
  };
}
l(J, "resolvePredicates");
async function ot(t) {
  const { labels: e, descriptions: r } = J(t), i = [...e, ...r], s = [
    `    ?concept skos:topConceptOf <${t.schemeIri}> .`,
    z("?concept", e, "label", !0),
    "    OPTIONAL { ?concept skos:notation ?notation }",
    z("?concept", r, "definition", !1),
    "    OPTIONAL { ?child skos:broader ?concept }"
  ].join(`
`), o = `${W(i)}

SELECT ?concept ?label ?notation ?definition (COUNT(?child) AS ?childCount)
WHERE {
${G(s, t.namedGraph)}
}
GROUP BY ?concept ?label ?notation ?definition
ORDER BY ?label`, n = await Y(t.endpoint, o, t.timeout);
  return ye(n.results.bindings);
}
l(ot, "fetchTopConcepts");
async function nt(t, e) {
  const { labels: r, descriptions: i } = J(t), s = [...r, ...i], o = [
    `    ?concept skos:broader <${e}> .`,
    z("?concept", r, "label", !0),
    "    OPTIONAL { ?concept skos:notation ?notation }",
    z("?concept", i, "definition", !1),
    "    OPTIONAL { ?child skos:broader ?concept }"
  ].join(`
`), n = `${W(s)}

SELECT ?concept ?label ?notation ?definition (COUNT(?child) AS ?childCount)
WHERE {
${G(o, t.namedGraph)}
}
GROUP BY ?concept ?label ?notation ?definition
ORDER BY ?label`, c = await Y(t.endpoint, n, t.timeout);
  return ye(c.results.bindings);
}
l(nt, "fetchNarrowerConcepts");
async function at(t, e, r = 50) {
  const { labels: i, descriptions: s } = J(t), o = [...i, ...s], n = e.replace(/\\/g, "\\\\").replace(/"/g, '\\"'), c = [
    `    ?concept skos:inScheme <${t.schemeIri}> .`,
    z("?concept", i, "label", !0),
    `    FILTER(CONTAINS(LCASE(?label), LCASE("${n}")))`,
    "    OPTIONAL { ?concept skos:notation ?notation }",
    z("?concept", s, "definition", !1)
  ].join(`
`), h = `${W(o)}

SELECT ?concept ?label ?notation ?definition
WHERE {
${G(c, t.namedGraph)}
}
ORDER BY ?label
LIMIT ${r}`;
  return (await Y(t.endpoint, h, t.timeout)).results.bindings.map((u) => ({
    iri: w(u, "concept"),
    label: w(u, "label") || w(u, "concept").split(/[#/]/).pop() || "",
    notation: w(u, "notation"),
    description: w(u, "definition"),
    children: [],
    hasChildren: !1,
    childrenLoaded: !0,
    loading: !1
  }));
}
l(at, "fetchSearchConcepts");
async function lt(t) {
  const { labels: e, descriptions: r } = J(t), i = [...e, ...r], s = [
    `    BIND(<${t.schemeIri}> AS ?scheme)`,
    z("?scheme", e, "label", !0),
    z("?scheme", r, "description", !1)
  ].join(`
`), o = `${W(i)}

SELECT ?label ?description
WHERE {
${G(s, t.namedGraph)}
}
LIMIT 1`, c = (await Y(t.endpoint, o, t.timeout)).results.bindings[0];
  return {
    label: w(c, "label") || t.schemeIri.split(/[#/]/).pop() || "Vocabulary",
    description: w(c, "description") || ""
  };
}
l(lt, "fetchSchemeMetadata");
var ct = Object.defineProperty, $ = /* @__PURE__ */ l((t, e, r, i) => {
  for (var s = void 0, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (s = n(e, r, s) || s);
  return s && ct(e, r, s), s;
}, "__decorateClass$1");
function fe(t) {
  const e = {
    "skos:": "http://www.w3.org/2004/02/skos/core#",
    "dcterms:": "http://purl.org/dc/terms/",
    "rdfs:": "http://www.w3.org/2000/01/rdf-schema#",
    "rdf:": "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  };
  return t.split(",").map((r) => {
    const i = r.trim();
    for (const [s, o] of Object.entries(e))
      if (i.startsWith(s))
        return o + i.slice(s.length);
    return i;
  });
}
l(fe, "parsePredicates");
class g extends L {
  static {
    l(this, "PrezVocabBase");
  }
  constructor() {
    super(...arguments), this.vocab = null, this.vocabUrl = null, this.baseUrl = null, this.sparqlEndpoint = null, this.vocabIri = null, this.namedGraph = null, this.timeout = 1e4, this.labelPredicates = null, this.descriptionPredicates = null, this.disabled = !1, this.lang = "en", this.theme = "auto", this.loading = !1, this.error = null, this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map();
  }
  /** Whether SPARQL mode is active */
  get sparqlMode() {
    return !!this.sparqlEndpoint;
  }
  /** Build SparqlConfig from current properties */
  get sparqlConfig() {
    return !this.sparqlEndpoint || !this.vocabIri ? null : {
      endpoint: this.sparqlEndpoint,
      schemeIri: this.vocabIri,
      namedGraph: this.namedGraph ?? void 0,
      timeout: this.timeout,
      labelPredicates: this.labelPredicates ? fe(this.labelPredicates) : void 0,
      descriptionPredicates: this.descriptionPredicates ? fe(this.descriptionPredicates) : void 0
    };
  }
  updated(e) {
    super.updated(e), (e.has("vocab") || e.has("vocabUrl") || e.has("baseUrl") || e.has("sparqlEndpoint") || e.has("vocabIri")) && this.loadVocab();
  }
  async loadVocab() {
    if (this.sparqlMode)
      return this.loadVocabFromSparql();
    const e = et(this.vocab, this.vocabUrl, this.baseUrl);
    if (!e) {
      this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map();
      return;
    }
    this.loading = !0, this.error = null;
    try {
      this.vocabData = await Ze(e), this.conceptMap = new Map(this.vocabData.concepts.map((r) => [r.iri, r])), this.dispatchEvent(new CustomEvent("prez-load", {
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
  /** Load vocabulary from a SPARQL endpoint */
  async loadVocabFromSparql() {
    const e = this.sparqlConfig;
    if (!e) {
      this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map();
      return;
    }
    this.loading = !0, this.error = null;
    try {
      const [r, i] = await Promise.all([
        lt(e),
        ot(e)
      ]), s = i.map((o) => ({
        iri: o.iri,
        label: o.label,
        notation: o.notation,
        description: o.description
      }));
      this.vocabData = {
        iri: e.schemeIri,
        label: r.label,
        description: r.description,
        concepts: s,
        tree: i
      }, this.conceptMap = new Map(s.map((o) => [o.iri, o])), this.dispatchEvent(new CustomEvent("prez-load", {
        bubbles: !0,
        composed: !0,
        detail: {
          vocab: this.vocabIri,
          url: e.endpoint,
          conceptCount: s.length
        }
      }));
    } catch (r) {
      this.error = r instanceof Error ? r.message : "Failed to query SPARQL endpoint", this.vocabData = null, this.conceptMap = /* @__PURE__ */ new Map(), this.dispatchEvent(new CustomEvent("prez-error", {
        bubbles: !0,
        composed: !0,
        detail: {
          vocab: this.vocabIri,
          url: e.endpoint,
          error: this.error
        }
      }));
    } finally {
      this.loading = !1;
    }
  }
  /** Lazily load children for a SPARQL tree node */
  async loadChildren(e) {
    const r = this.sparqlConfig;
    if (!r || !this.vocabData) return;
    const i = this.findTreeNode(e, this.vocabData.tree);
    if (!i) return;
    const s = i;
    if (!s.childrenLoaded) {
      s.loading = !0, this.requestUpdate();
      try {
        const o = await nt(r, e);
        s.children = o, s.childrenLoaded = !0;
        for (const n of o)
          if (!this.conceptMap.has(n.iri)) {
            const c = {
              iri: n.iri,
              label: n.label,
              notation: n.notation,
              description: n.description,
              broader: [e]
            };
            this.vocabData.concepts.push(c), this.conceptMap.set(n.iri, c);
          }
      } catch (o) {
        s.childrenLoaded = !1;
        const n = o instanceof Error ? o.message : "Failed to load children";
        this.dispatchEvent(new CustomEvent("prez-error", {
          bubbles: !0,
          composed: !0,
          detail: { iri: e, error: n }
        }));
      } finally {
        s.loading = !1, this.requestUpdate();
      }
    }
  }
  /** Recursively find a tree node by IRI */
  findTreeNode(e, r) {
    for (const i of r) {
      if (i.iri === e) return i;
      if (i.children.length > 0) {
        const s = this.findTreeNode(e, i.children);
        if (s) return s;
      }
    }
    return null;
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
  f({ type: String })
], g.prototype, "vocab");
$([
  f({ type: String, attribute: "vocab-url" })
], g.prototype, "vocabUrl");
$([
  f({ type: String, attribute: "base-url" })
], g.prototype, "baseUrl");
$([
  f({ type: String, attribute: "sparql-endpoint" })
], g.prototype, "sparqlEndpoint");
$([
  f({ type: String, attribute: "vocab-iri" })
], g.prototype, "vocabIri");
$([
  f({ type: String, attribute: "named-graph" })
], g.prototype, "namedGraph");
$([
  f({ type: Number })
], g.prototype, "timeout");
$([
  f({ type: String, attribute: "label-predicates" })
], g.prototype, "labelPredicates");
$([
  f({ type: String, attribute: "description-predicates" })
], g.prototype, "descriptionPredicates");
$([
  f({ type: Boolean, reflect: !0 })
], g.prototype, "disabled");
$([
  f({ type: String })
], g.prototype, "lang");
$([
  f({ type: String, reflect: !0 })
], g.prototype, "theme");
$([
  A()
], g.prototype, "loading");
$([
  A()
], g.prototype, "error");
$([
  A()
], g.prototype, "vocabData");
$([
  A()
], g.prototype, "conceptMap");
var dt = Object.defineProperty, ht = Object.getOwnPropertyDescriptor, v = /* @__PURE__ */ l((t, e, r, i) => {
  for (var s = i > 1 ? void 0 : i ? ht(e, r) : e, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (s = (i ? n(e, r, s) : n(s)) || s);
  return i && s && dt(e, r, s), s;
}, "__decorateClass");
let m = class extends g {
  static {
    l(this, "PrezList");
  }
  constructor() {
    super(...arguments), this.type = "select", this.fields = "", this.multiple = !1, this.flat = !1, this.horizontal = !1, this.search = !1, this.maxLevel = 1, this.showSelected = !0, this.placeholder = "Select...", this.value = null, this.values = [], this.showCount = !1, this.showDescription = !1, this.showIri = !1, this.filterText = "", this.expandedNodes = /* @__PURE__ */ new Set(), this.dropdownOpen = !1, this.sparqlSearchResults = null, this.searchDebounceTimer = null, this.boundHandleClickOutside = this.handleClickOutside.bind(this);
  }
  connectedCallback() {
    super.connectedCallback(), document.addEventListener("click", this.boundHandleClickOutside);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), document.removeEventListener("click", this.boundHandleClickOutside), this.searchDebounceTimer && clearTimeout(this.searchDebounceTimer);
  }
  handleClickOutside(t) {
    this.dropdownOpen && !this.contains(t.target) && (this.dropdownOpen = !1);
  }
  updated(t) {
    super.updated(t), t.has("vocabData") && this.vocabData && this.initializeExpanded();
  }
  initializeExpanded() {
    if (this.vocabData?.tree) {
      if (this.sparqlMode) {
        this.expandedNodes = /* @__PURE__ */ new Set();
        return;
      }
      if (this.maxLevel === -1) {
        const t = /* @__PURE__ */ new Set(), e = /* @__PURE__ */ l((r) => {
          for (const i of r)
            i.children.length > 0 && (t.add(i.iri), e(i.children));
        }, "collectIris");
        e(this.vocabData.tree), this.expandedNodes = t;
      } else if (this.maxLevel > 0) {
        const t = /* @__PURE__ */ new Set(), e = /* @__PURE__ */ l((r, i) => {
          if (!(i <= 0))
            for (const s of r)
              s.children.length > 0 && (t.add(s.iri), e(s.children, i - 1));
        }, "expandToLevel");
        e(this.vocabData.tree, this.maxLevel), this.expandedNodes = t;
      }
    }
  }
  handleFilter(t) {
    this.filterText = t.target.value, this.emitFilter(this.filterText), this.sparqlMode && this.debounceSparqlSearch(this.filterText);
  }
  debounceSparqlSearch(t) {
    if (this.searchDebounceTimer && clearTimeout(this.searchDebounceTimer), !t) {
      this.sparqlSearchResults = null;
      return;
    }
    this.searchDebounceTimer = setTimeout(async () => {
      const e = this.sparqlConfig;
      if (e)
        try {
          this.sparqlSearchResults = await at(e, t);
        } catch {
          this.sparqlSearchResults = [];
        }
    }, 300);
  }
  async toggleExpand(t, e) {
    e.stopPropagation();
    const r = new Set(this.expandedNodes), i = r.has(t);
    !i && this.sparqlMode && await this.loadChildren(t), i ? r.delete(t) : r.add(t), this.expandedNodes = r, this.emitExpand(t, !i);
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
      const o = r.filter((n) => !this.values.includes(n));
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
    const e = this.filterText.toLowerCase(), r = /* @__PURE__ */ l((s) => s.label.toLowerCase().includes(e) || s.notation?.toLowerCase().includes(e), "matchesFilter"), i = /* @__PURE__ */ l((s) => {
      const o = s.children.map(i).filter((n) => n !== null);
      return r(s) || o.length > 0 ? { ...s, children: o } : null;
    }, "filterNode");
    return t.map(i).filter((s) => s !== null);
  }
  nodeHasChildren(t) {
    return t.children.length > 0 ? !0 : this.sparqlMode && "hasChildren" in t ? t.hasChildren : !1;
  }
  isNodeLoading(t) {
    return "loading" in t ? t.loading : !1;
  }
  renderTreeNode(t) {
    const e = this.nodeHasChildren(t), r = this.isNodeLoading(t), i = this.expandedNodes.has(t.iri) || this.filterText && e && !this.sparqlMode, s = this.multiple ? this.values.includes(t.iri) : this.value === t.iri;
    return a`
      <li class="tree-item">
        <div
          class="tree-row ${this.showSelected && s ? "selected" : ""}"
          @click=${() => this.selectNode(t.iri)}
        >
          ${r ? a`<span class="node-loading"></span>` : e ? a`
            <button
              class="expand-btn"
              @click=${(o) => this.toggleExpand(t.iri, o)}
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
              @click=${(o) => {
      o.stopPropagation(), this.selectNode(t.iri);
    }}
              @dblclick=${(o) => this.selectNodeWithDescendants(t, o)}
              title="Double-click to select/deselect with all children"
            >
          ` : d}
          ${t.notation ? a`<span class="notation">${t.notation}</span>` : d}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? a`
              <span class="description">${t.description}</span>
            ` : d}
          </div>
          ${this.showCount && e ? a`
            <span class="count">(${this.countDescendants(t)})</span>
          ` : d}
        </div>
        ${e && i && t.children.length > 0 ? a`
          <ul class="children">
            ${t.children.map((o) => this.renderTreeNode(o))}
          </ul>
        ` : d}
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
      return e.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : a`
        ${this.renderSelectControls()}
        <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || "Vocabulary list"}>
          ${e.map((r) => {
        const i = this.multiple ? this.values.includes(r.iri) : this.value === r.iri;
        return a`
              <li class="flat-item">
                <div
                  class="tree-row ${this.showSelected && i ? "selected" : ""}"
                  role="option"
                  aria-selected=${i}
                  @click=${() => this.selectNode(r.iri)}
                >
                  ${this.multiple ? a`
                    <input
                      type="checkbox"
                      class="checkbox"
                      .checked=${i}
                      @click=${(s) => {
          s.stopPropagation(), this.selectNode(r.iri);
        }}
                    >
                  ` : d}
                  ${r.notation ? a`<span class="notation">${r.notation}</span>` : d}
                  <div class="item-content">
                    <span class="label">${r.label}</span>
                    ${this.showDescription && r.description ? a`
                      <span class="description">${r.description}</span>
                    ` : d}
                  </div>
                </div>
              </li>
            `;
      })}
        </ul>
      `;
    }
    if (this.sparqlMode && this.filterText && this.sparqlSearchResults !== null)
      return this.sparqlSearchResults.length === 0 ? a`<div class="empty">No matching concepts</div>` : a`
        <ul class="tree" role="tree" aria-label=${this.vocabData?.label || "Search results"}>
          ${this.sparqlSearchResults.map((e) => this.renderTreeNode(e))}
        </ul>
      `;
    const t = this.sparqlMode ? this.vocabData?.tree || [] : this.filterTreeNodes(this.vocabData?.tree || []);
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
    this.filterText = t.target.value, this.emitFilter(this.filterText), this.dropdownOpen || (this.dropdownOpen = !0), this.sparqlMode && this.debounceSparqlSearch(this.filterText);
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
              @click=${(r) => r.stopPropagation()}
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
                <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid var(--prez-divider);">
                  ${this.values.length} selected
                </div>
              ` : d}
            </div>
          ` : d}
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
              <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid var(--prez-divider);">
                ${this.values.length} selected
              </div>
            ` : d}
          </div>
        ` : d}
      </div>
    `;
  }
  renderSelectControls() {
    if (!this.multiple) return d;
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
    if (this.sparqlMode && this.filterText && this.sparqlSearchResults !== null)
      return this.sparqlSearchResults.length === 0 ? a`<div class="empty">No matching concepts</div>` : a`
        <ul class="tree" role="tree" aria-label=${this.vocabData?.label || "Search results"}>
          ${this.sparqlSearchResults.map((e) => this.renderTreeNode(e))}
        </ul>
      `;
    const t = this.sparqlMode ? this.vocabData?.tree || [] : this.filterTreeNodes(this.vocabData?.tree || []);
    return t.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : a`
      ${this.renderSelectControls()}
      <ul class="tree" role="tree" aria-label=${this.vocabData?.label || "Vocabulary tree"}>
        ${t.map((e) => this.renderTreeNode(e))}
      </ul>
      ${this.multiple && this.values.length > 0 ? a`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : d}
    `;
  }
  renderRadioNode(t, e) {
    const r = t.children.length > 0, i = t.children.length > 1, s = this.value === t.iri, o = `radio-${this.vocab || "vocab"}`, n = this.horizontal && i && !e;
    return a`
      <div class="radio-node">
        <label class="radio-item">
          <input
            type="radio"
            name=${o}
            .checked=${s}
            @change=${() => this.selectRadio(t.iri)}
          />
          ${t.notation ? a`<span class="notation">${t.notation}</span>` : d}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? a`
              <span class="description">${t.description}</span>
            ` : d}
          </div>
        </label>
        ${r ? a`
          <div class="radio-children ${this.horizontal ? "horizontal" : ""} ${n ? "with-separator" : ""}">
            ${t.children.map((c, h) => {
      const p = e && h === t.children.length - 1;
      return this.renderRadioNode(c, p);
    })}
          </div>
        ` : d}
      </div>
    `;
  }
  renderRadio() {
    const t = this.filterTreeNodes(this.vocabData?.tree || []);
    return t.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : a`
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
    return a`
      <tr
        class="${r ? "selected" : ""}"
        @click=${() => this.selectNode(t.iri)}
        style="cursor: pointer"
      >
        ${this.multiple ? a`
          <td class="cell-checkbox">
            <input
              type="checkbox"
              .checked=${r}
              @click=${(s) => {
      s.stopPropagation(), this.selectNode(t.iri);
    }}
            />
          </td>
        ` : d}
        ${i.map((s, o) => a`
          <td class="${s === "iri" ? "cell-iri" : s === "description" ? "cell-description" : ""}">
            ${o === 0 && !this.flat && e > 0 ? a`
              <div class="cell-indent">
                ${Array(e).fill(0).map(() => a`<span class="indent-spacer"></span>`)}
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
      return r.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No concepts available"}</div>` : a`
        ${this.renderSelectControls()}
        <table class="vocab-table">
          <thead>
            <tr>
              ${this.multiple ? a`<th class="cell-checkbox"></th>` : d}
              ${t.map((i) => a`<th>${this.getFieldLabel(i)}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${r.map((i) => this.renderTableRow(i, 0))}
          </tbody>
        </table>
        ${this.multiple && this.values.length > 0 ? a`
          <div class="selection-count">
            ${this.values.length} selected
          </div>
        ` : d}
      `;
    }
    const e = this.filterTreeNodes(this.vocabData?.tree || []);
    return e.length === 0 ? a`<div class="empty">${this.filterText ? "No matching concepts" : "No hierarchy available"}</div>` : a`
      ${this.renderSelectControls()}
      <table class="vocab-table">
        <thead>
          <tr>
            ${this.multiple ? a`<th class="cell-checkbox"></th>` : d}
            ${t.map((r) => a`<th>${this.getFieldLabel(r)}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${e.flatMap((r) => this.renderTableTreeRows(r, 0))}
        </tbody>
      </table>
      ${this.multiple && this.values.length > 0 ? a`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : d}
    `;
  }
  renderFlatItem(t) {
    const e = this.multiple ? this.values.includes(t.iri) : this.value === t.iri;
    if (this.type === "radio") {
      const r = `radio-${this.vocab || "vocab"}`;
      return a`
        <div class="radio-node">
          <label class="radio-item">
            <input
              type="radio"
              name=${r}
              .checked=${e}
              @change=${() => this.selectRadio(t.iri)}
            />
            ${t.notation ? a`<span class="notation">${t.notation}</span>` : d}
            <div class="item-content">
              <span class="label">${t.label}</span>
              ${this.showDescription && t.description ? a`
                <span class="description">${t.description}</span>
              ` : d}
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
              @click=${(r) => {
      r.stopPropagation(), this.selectNode(t.iri);
    }}
            >
          ` : d}
          ${t.notation ? a`<span class="notation">${t.notation}</span>` : d}
          <div class="item-content">
            <span class="label">${t.label}</span>
            ${this.showDescription && t.description ? a`
              <span class="description">${t.description}</span>
            ` : d}
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
      ` : d}
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
        ` : d}
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
        ` : d}
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
      ` : d}
      ${this.flat ? this.renderFlatList() : this.renderTree()}
    ` : a`<div class="loading">No vocabulary specified</div>`;
  }
};
m.styles = ze`
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

    .node-loading {
      display: inline-block;
      width: 0.75rem;
      height: 0.75rem;
      border: 1.5px solid var(--prez-border);
      border-top-color: var(--prez-primary);
      border-radius: 50%;
      animation: prez-spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes prez-spin {
      to { transform: rotate(360deg); }
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
v([
  f({ type: String })
], m.prototype, "type", 2);
v([
  f({ type: String })
], m.prototype, "fields", 2);
v([
  f({ type: Boolean })
], m.prototype, "multiple", 2);
v([
  f({ type: Boolean })
], m.prototype, "flat", 2);
v([
  f({ type: Boolean })
], m.prototype, "horizontal", 2);
v([
  f({ type: Boolean })
], m.prototype, "search", 2);
v([
  f({ type: Number, attribute: "max-level" })
], m.prototype, "maxLevel", 2);
v([
  f({ type: Boolean, attribute: "show-selected" })
], m.prototype, "showSelected", 2);
v([
  f({ type: String })
], m.prototype, "placeholder", 2);
v([
  f({ type: String })
], m.prototype, "value", 2);
v([
  f({ type: Array, attribute: "values" })
], m.prototype, "values", 2);
v([
  f({ type: Boolean, attribute: "show-count" })
], m.prototype, "showCount", 2);
v([
  f({ type: Boolean, attribute: "show-description" })
], m.prototype, "showDescription", 2);
v([
  f({ type: Boolean, attribute: "show-iri" })
], m.prototype, "showIri", 2);
v([
  A()
], m.prototype, "filterText", 2);
v([
  A()
], m.prototype, "expandedNodes", 2);
v([
  A()
], m.prototype, "dropdownOpen", 2);
v([
  A()
], m.prototype, "sparqlSearchResults", 2);
m = v([
  We("prez-list")
], m);
export {
  m as PrezList,
  g as PrezVocabBase,
  bt as clearCache,
  Ke as detectBaseUrl,
  nt as fetchNarrowerConcepts,
  at as fetchSearchConcepts,
  ot as fetchTopConcepts,
  Ze as fetchVocab,
  et as resolveVocabUrl
};
