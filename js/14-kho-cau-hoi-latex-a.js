// =====================================================
//  KHO CÂU HỎI: SOẠN BẰNG LaTeX (kiểu TeXstudio / ex_test), XEM TRƯỚC TRỰC TIẾP
// =====================================================
const KHO_KHO = 'skyedu-kho-cau-hoi';
const KHO_MON = ['Toán', 'Vật lí', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Khác'];
const KHO_MUC = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
const TEX_MACROS = {
    '\\heva': '\\left\\{\\begin{aligned}#1\\end{aligned}\\right.',
    '\\hoac': '\\left[\\begin{aligned}#1\\end{aligned}\\right.',
    '\\overarc': '\\overset{\\frown}{#1}',
    '\\Oxy': 'Oxy', '\\Oxyz': 'Oxyz'
};

let khoCH = docKho('localStorage', KHO_KHO);
if (!Array.isArray(khoCH)) { khoCH = []; }
function luuKho() { ghiKho('localStorage', KHO_KHO, khoCH); if (window.khoDongBoDay) { window.khoDongBoDay(); } }

// ---------- Hiển thị LaTeX -> HTML (an toàn: văn bản luôn được escape) ----------
function toanHoc(body, hienRieng) {
    body = body.replace(/\u0001/g, '\\$');
    if (window.katex) {
        try {
            return window.katex.renderToString(body, { displayMode: hienRieng, throwOnError: false, strict: 'ignore', macros: TEX_MACROS });
        } catch (e) { /* rơi xuống bản chữ thô */ }
    }
    return '<code>' + thoat(body) + '</code>';
}
function vanBanTex(t) {
    let h = thoat(t.replace(/\u0001/g, '$'));
    for (let i = 0; i < 2; i++) {
        h = h.replace(/\\textbf\{([^{}]*)\}/g, '<b>$1</b>')
             .replace(/\\(?:textit|emph)\{([^{}]*)\}/g, '<i>$1</i>')
             .replace(/\\underline\{([^{}]*)\}/g, '<u>$1</u>')
             .replace(/\\text(?:rm|normal)\{([^{}]*)\}/g, '$1');
    }
    h = h.replace(/\\begin\{center\}/g, '<div style="text-align:center">').replace(/\\end\{center\}/g, '</div>')
         .replace(/\\begin\{itemize\}/g, '<ul>').replace(/\\end\{itemize\}/g, '</ul>')
         .replace(/\\begin\{enumerate\}/g, '<ol>').replace(/\\end\{enumerate\}/g, '</ol>')
         .replace(/\\item\s*/g, '<li>')
         .replace(/\\\\\s*/g, '<br>').replace(/\\newline\s*/g, '<br>')
         .replace(/\\(?:hfill|noindent|medskip|bigskip|smallskip)\b\s*/g, '')
         .replace(/\\vspace\*?\{[^{}]*\}/g, '')
         .replace(/\\(?:ldots|dots)\b/g, '…')
         .replace(/\\%/g, '%').replace(/\\&amp;/g, '&amp;').replace(/\\#/g, '#').replace(/\\_/g, '_')
         .replace(/\\\{/g, '{').replace(/\\\}/g, '}')
         .replace(/~/g, '&nbsp;')
         .replace(/\n[ \t]*\n+/g, '<br><br>').replace(/\n/g, ' ');
    return h;
}
// =====================================================
//  TRÌNH VẼ TikZ -> SVG (tập con phổ biến trong đề Toán / Lý)
//  Hỗ trợ: \draw \fill \filldraw \path \node \coordinate \foreach \def \pgfmathsetmacro
//  --, -|, |-, rectangle, circle, ellipse, arc, grid, .. controls .., node, cycle, màu a!50!b,
//  mũi tên (->, <->, -stealth), nét đứt, độ dày, scale, tọa độ cực / tương đối.
// =====================================================
const TK_PX = 40, TK_PT = 1 / 28.4528;       // 1 cm = 40 px
let TK_UID = 0;
const TK_COL = { red: '#e53935', blue: '#1e5bd8', green: '#2e9e44', black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080',
    orange: '#ff8000', yellow: '#ffe000', cyan: '#00bcd4', magenta: '#d81b9a', brown: '#8b5a2b', purple: '#8e24aa', violet: '#7e57c2',
    pink: '#ff7eb6', teal: '#00897b', lime: '#9be000', olive: '#808000', darkgray: '#404040', lightgray: '#bfbfbf' };

function tkIsColor(k) { return /^[a-zA-Z]+(![0-9.]+(![a-zA-Z]+)?)*$/.test(k) && Object.prototype.hasOwnProperty.call(TK_COL, k.split('!')[0].toLowerCase()); }
function tkRgb(n) {
    n = n.trim();
    const h = /^#[0-9a-f]{6}$/i.test(n) ? n : (TK_COL[n.toLowerCase()] || '#000000');
    return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); });
}
function tkColor(spec) {
    if (!spec || spec === true) { return null; }
    const p = String(spec).trim().split('!'); let c = tkRgb(p[0]);
    for (let i = 1; i < p.length; i += 2) {
        let t = parseFloat(p[i]); t = isNaN(t) ? 1 : Math.max(0, Math.min(100, t)) / 100;
        const o = p[i + 1] ? tkRgb(p[i + 1]) : [255, 255, 255];
        c = c.map(function (v, k) { return Math.round(v * t + o[k] * (1 - t)); });
    }
    return 'rgb(' + c.join(',') + ')';
}

// Biểu thức số học kiểu TikZ: 2*cos(30)+1cm, sqrt(3)/2, ...  (kết quả tính bằng cm; sin/cos theo độ)
function tkEval(str) {
    const s = String(str).replace(/[{}]/g, '').replace(/\s+/g, '');
    const UN = { cm: 1, mm: 0.1, pt: TK_PT, 'in': 2.54, em: 0.35, ex: 0.15 };
    let i = 0;
    function primary() {
        if (s[i] === '(') { i++; const v = expr(); if (s[i] === ')') { i++; } return v; }
        let m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
        if (m) {
            i += m[0].length; let v = parseFloat(m[0]);
            const u = /^(cm|mm|pt|in|em|ex)/.exec(s.slice(i));
            if (u) { i += u[0].length; v *= UN[u[0]]; }
            return v;
        }
        m = /^[a-zA-Z]+/.exec(s.slice(i));
        if (m) {
            const nm = m[0].toLowerCase(); i += nm.length;
            if (nm === 'pi') { return Math.PI; }
            const F = { sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
                        sin: function (x) { return Math.sin(x * Math.PI / 180); }, cos: function (x) { return Math.cos(x * Math.PI / 180); },
                        tan: function (x) { return Math.tan(x * Math.PI / 180); }, deg: function (x) { return x * 180 / Math.PI; }, rad: function (x) { return x * Math.PI / 180; } };
            if (F[nm] && s[i] === '(') { i++; const v = expr(); if (s[i] === ')') { i++; } return F[nm](v); }
            throw new Error('không hiểu "' + m[0] + '" trong biểu thức');
        }
        throw new Error('biểu thức lạ: "' + s + '"');
    }
    function unary() { if (s[i] === '-') { i++; return -unary(); } if (s[i] === '+') { i++; return unary(); } return primary(); }
    function power() { let b = unary(); while (s[i] === '^') { i++; b = Math.pow(b, unary()); } return b; }
    function term() { let v = power(); while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const r = power(); v = o === '*' ? v * r : v / r; } return v; }
    function expr() { let v = term(); while (s[i] === '+' || s[i] === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
    if (s === '') { throw new Error('thiếu giá trị'); }
    const v = expr();
    if (i < s.length) { throw new Error('biểu thức lạ: "' + s + '"'); }
    return v;
}

// Tách chuỗi theo dấu sep nhưng bỏ qua ngoặc (), [], {}
function tkSplit(s, sep) {
    const out = []; let d = 0, cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '\\') { cur += c + (s[i + 1] || ''); i++; continue; }
        if (c === '(' || c === '[' || c === '{') { d++; } else if (c === ')' || c === ']' || c === '}') { d--; }
        if (c === sep && d <= 0) { out.push(cur); cur = ''; } else { cur += c; }
    }
    out.push(cur);
    return out;
}
function tkMatch(s, i, open, close) {          // vị trí dấu đóng tương ứng s[i]
    let d = 0;
    for (let j = i; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === open) { d++; } else if (s[j] === close) { d--; if (d === 0) { return j; } }
    }
    throw new Error('thiếu dấu ' + close);
}
function tkOpts(str) {
    const o = {};
    tkSplit(str || '', ',').forEach(function (e) {
        e = e.trim(); if (!e) { return; }
        const k = e.indexOf('=');
        if (k > 0 && !/^[-<>|]/.test(e)) {
            o[e.slice(0, k).trim().replace(/\s+/g, ' ').toLowerCase()] = e.slice(k + 1).trim().replace(/^\{([\s\S]*)\}$/, '$1');
        } else {
            const key = e.replace(/\s+/g, ' ');
            o[key.toLowerCase() === key ? key : key.toLowerCase()] = true;
            if (tkIsColor(key)) { o.color = key; }
        }
    });
    if (o['help lines']) { if (!o.color) { o.color = 'gray!50'; } o['very thin'] = true; }
    return o;
}

const TK_LW = { 'ultra thin': 0.1, 'very thin': 0.2, 'thin': 0.4, 'semithick': 0.6, 'thick': 0.8, 'very thick': 1.2, 'ultra thick': 1.6 };
function tkStyle(opts, cmd, ctx) {
    const st = { draw: false, fill: null, stroke: tkColor(opts.draw) || tkColor(opts.color) || '#000000', lw: 1, dash: '', a0: '', a1: '', op: 1, fop: 1, dop: 1 };
    st.draw = cmd === 'draw' || cmd === 'filldraw' || cmd === 'shadedraw' || opts.draw !== undefined;
    if (opts.fill && opts.fill !== true) { st.fill = tkColor(opts.fill); }
    if (cmd === 'fill' || cmd === 'filldraw') { st.fill = st.fill || tkColor(opts.color) || '#000000'; }
    let pt = 0.4;
    Object.keys(TK_LW).forEach(function (k) { if (opts[k]) { pt = TK_LW[k]; } });
    if (opts['line width']) { try { pt = tkEval(opts['line width']) / TK_PT; } catch (e) {} }
    st.lw = Math.max(1, pt * 2.2);
    if (opts.dotted || opts['densely dotted'] || opts['loosely dotted']) { st.dash = '0.1 ' + (opts['densely dotted'] ? 3 : opts['loosely dotted'] ? 7 : 5); }
    else if (opts.dashed || opts['densely dashed'] || opts['loosely dashed']) { st.dash = opts['densely dashed'] ? '5 3' : opts['loosely dashed'] ? '9 7' : '7 5'; }
    ['opacity', 'fill opacity', 'draw opacity'].forEach(function (k) {
        if (opts[k] !== undefined) { const v = parseFloat(opts[k]); if (!isNaN(v)) { if (k === 'opacity') { st.op = v; } else if (k === 'fill opacity') { st.fop = v; } else { st.dop = v; } } }
    });
    const tips = [opts.arrows].concat(Object.keys(opts));
    tips.forEach(function (k) {
        if (typeof k !== 'string') { return; }
        const m = /^(<|>|stealth|latex|to|<<|>>)?-(>|<|stealth|latex|to|>>|<<)?$/.exec(k.replace(/^\{|\}$/g, ''));
        if (m && (m[1] || m[2])) { if (m[1]) { st.a0 = m[1]; } if (m[2]) { st.a1 = m[2]; } }
    });
    return st;
}

function tkSub(s, name, val) {
    // Không thay tên biến ngay sau \\pgfmathsetmacro{ hoặc \\def (đó là chỗ đặt tên biến mới)
    return s.replace(new RegExp('(?<!\\\\pgfmathsetmacro\\s*\\{|\\\\def\\s*)' + name.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), function () { return val; });
}
const tkNum = function (n) { return String(Math.round(n * 1e6) / 1e6); };

function tkForVals(list) {
    const it = tkSplit(list, ',').map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
    const out = [];
    for (let k = 0; k < it.length; k++) {
        if (it[k] === '...' || it[k] === '\\ldots' || it[k] === '\\dots' || it[k] === '…') {
            if (out.length === 0 || k + 1 >= it.length) { throw new Error('dấu ... dùng sai trong \\foreach'); }
            const b = tkEval(out[out.length - 1]), end = tkEval(it[k + 1]);
            const step = out.length >= 2 ? b - tkEval(out[out.length - 2]) : (end >= b ? 1 : -1);
            if (step === 0 || (end - b) * step < 0) { throw new Error('dãy ... trong \\foreach không hợp lệ'); }
            for (let v = b + step, n = 0; (step > 0 ? v < end - 1e-9 : v > end + 1e-9) && n < 500; v += step, n++) { out.push(tkNum(v)); }
        } else { out.push(it[k]); }
    }
    if (out.length > 500) { throw new Error('\\foreach quá dài'); }
    return out;
}


// Tọa độ dạng biểu thức: $(A)+(x,y)$, $(A)-(B)$, $(A)!t!(B)$ (trung điểm và chia đoạn)
function tkCoordNguyenTu(inner, ctx) {
    const s = inner.trim();
    if (/^[A-Za-z][\w.\- ]*$/.test(s) && !/^(sqrt|sin|cos|tan|pi)$/.test(s)) {
        const nm = s.split('.')[0].trim();
        if (ctx.names[nm]) { return { x: ctx.names[nm].x, y: ctx.names[nm].y }; }
        throw new Error('chưa có điểm tên "' + nm + '"');
    }
    const phan = tkSplit(s, ',');
    if (phan.length === 1 && tkSplit(s, ':').length === 2) {
        const q = tkSplit(s, ':'); const a = tkEval(q[0]), r = tkEval(q[1]) * ctx.sc;
        return { x: r * Math.cos(a * Math.PI / 180), y: r * Math.sin(a * Math.PI / 180) };
    }
    if (phan.length === 2) { return { x: tkEval(phan[0]) * ctx.sc, y: tkEval(phan[1]) * ctx.sc }; }
    throw new Error('tọa độ "(' + s + ')" chưa được hỗ trợ');
}
function tkCoordExpr(s, ctx) {
    let i = 0; const n = s.length;
    function khoangTrang() { while (i < n && /\s/.test(s[i])) { i++; } }
    function nhom() {
        khoangTrang();
        if (s[i] !== '(') { throw new Error('biểu thức tọa độ thiếu dấu ('); }
        const e = tkMatch(s, i, '(', ')');
        const v = tkCoordNguyenTu(s.slice(i + 1, e), ctx);
        i = e + 1; return v;
    }
    let ketQua = nhom();
    khoangTrang();
    while (i < n) {
        const c = s[i];
        if (c === '+' || c === '-') {
            i++; const v = nhom();
            const sg = c === '+' ? 1 : -1;
            ketQua = { x: ketQua.x + sg * v.x, y: ketQua.y + sg * v.y };
        } else if (c === '!') {
            const e2 = s.indexOf('!', i + 1); if (e2 < 0) { throw new Error('biểu thức ! thiếu dấu !'); }
            const t = tkEval(s.slice(i + 1, e2)); i = e2 + 1;
            const v = nhom();
            ketQua = { x: ketQua.x + t * (v.x - ketQua.x), y: ketQua.y + t * (v.y - ketQua.y) };
        } else { throw new Error('biểu thức tọa độ không hiểu "' + c + '"'); }
        khoangTrang();
    }
    return ketQua;
}

function tkCoord(raw, ctx) {
    const t = raw.trim();
    if (/^\$[\s\S]*\$$/.test(t)) { return tkCoordExpr(t.slice(1, -1), ctx); }
    if (/^[A-Za-z][\w.\- ]*$/.test(t) && !/^(sqrt|sin|cos|tan|pi)$/.test(t)) {
        const nm = t.split('.')[0].trim();
        if (ctx.names[nm]) { return { x: ctx.names[nm].x, y: ctx.names[nm].y }; }
        throw new Error('chưa có điểm tên "' + nm + '"');
    }
    const parts = tkSplit(t, ',');
    if (parts.length === 1 && tkSplit(t, ':').length === 2) {
        const q = tkSplit(t, ':'); const a = tkEval(q[0]), r = tkEval(q[1]) * ctx.sc;
        return { x: r * Math.cos(a * Math.PI / 180), y: r * Math.sin(a * Math.PI / 180) };
    }
    if (parts.length === 2) { return { x: tkEval(parts[0]) * ctx.sc, y: tkEval(parts[1]) * ctx.sc }; }
    throw new Error('tọa độ "' + t + '" chưa được hỗ trợ (chỉ dạng 2D)');
}

function tkMarker(ctx, color) {
    if (!ctx.markers[color]) { ctx.markers[color] = 'tkm' + ctx.uid + '_' + Object.keys(ctx.markers).length; }
    return ctx.markers[color];
}

function tkNodeSvg(n, ctx) {
    const o = n.opts; let dx = 0, dy = 0;
    Object.keys(o).forEach(function (k) {
        k.split(' ').forEach(function (w) { if (w === 'above') { dy = -1; } else if (w === 'below') { dy = 1; } else if (w === 'left') { dx = -1; } else if (w === 'right') { dx = 1; } });
    });
    if (typeof o.anchor === 'string') {
        if (/north/.test(o.anchor)) { dy = 1; } if (/south/.test(o.anchor)) { dy = -1; }
        if (/west/.test(o.anchor)) { dx = 1; } if (/east/.test(o.anchor)) { dx = -1; }
    }
    const W = 140, H = 44, gap = 4;
    const px = n.pos.x * TK_PX, py = -n.pos.y * TK_PX;
    const x = dx > 0 ? px + gap : dx < 0 ? px - gap - W : px - W / 2;
    const y = dy > 0 ? py + gap : dy < 0 ? py - gap - H : py - H / 2;
    ctx.bbPt(px - 60, py - 34); ctx.bbPt(px + 60, py + 34);
    const col = tkColor(o.text) || tkColor(o.color) || '#1a1a1a';
    let box = '';
    if (o.draw !== undefined) { box += 'border:1px solid ' + (o.draw === true ? (tkColor(o.color) || '#000') : tkColor(o.draw)) + ';'; }
    if (o.fill && o.fill !== true) { box += 'background:' + tkColor(o.fill) + ';'; }
    box += o.circle ? 'border-radius:50%;padding:3px 6px;' : 'padding:1px 4px;';
    const just = dx > 0 ? 'flex-start' : dx < 0 ? 'flex-end' : 'center';
    const alg = dy > 0 ? 'flex-start' : dy < 0 ? 'flex-end' : 'center';
    return '<foreignObject x="' + tkNum(x) + '" y="' + tkNum(y) + '" width="' + W + '" height="' + H + '" style="overflow:visible">' +
        '<div style="display:flex;width:100%;height:100%;justify-content:' + just + ';align-items:' + alg + ';font-size:14px;line-height:1.25;color:' + col + ';">' +
        '<span style="' + box + 'text-align:center;white-space:nowrap">' + tex(n.text) + '</span></div></foreignObject>';
}

function tkPath(s, ctx, cmd, opts) {
    const st = tkStyle(opts, cmd, ctx), S = TK_PX;
    let d = '', cp = null, start = null, rel = null, pend = null, lastSeg = null, bez = null;
    const nodes = [];
    const P = function (p) { ctx.bbPt(p.x * S, -p.y * S); return tkNum(p.x * S) + ' ' + tkNum(-p.y * S); };
    function move(p) { d += 'M' + P(p) + ' '; cp = start = p; }
    function lineTo(p) { if (!cp) { move(p); return; } d += 'L' + P(p) + ' '; lastSeg = { a: cp, b: p }; cp = p; }
    function needCp() { if (!cp) { throw new Error('thiếu điểm bắt đầu'); } }
    function skipWs(i) { while (i < s.length && /\s/.test(s[i])) { i++; } return i; }

    function apply(p) {
        if (bez && !bez.closing) { bez.pts.push(p); return; }
        if (bez && bez.closing) {
            const c1 = bez.pts[0], c2 = bez.pts[1] || bez.pts[0];
            needCp(); d += 'C' + P(c1) + ',' + P(c2) + ',' + P(p) + ' '; cp = p; bez = null; return;
        }
        if (pend === null) { move(p); }
        else if (pend === '--') { lineTo(p); }
        else if (pend === '-|') { needCp(); lineTo({ x: p.x, y: cp.y }); lineTo(p); }
        else if (pend === '|-') { needCp(); lineTo({ x: cp.x, y: p.y }); lineTo(p); }
        else if (pend === 'rect') {
            needCp();
            d += 'M' + P(cp) + 'L' + P({ x: p.x, y: cp.y }) + 'L' + P(p) + 'L' + P({ x: cp.x, y: p.y }) + 'Z ';
            cp = p;
        } else if (pend && pend.grid) {
            needCp();
            const stx = pend.sx, sty = pend.sy;
            const x0 = Math.min(cp.x, p.x), x1 = Math.max(cp.x, p.x), y0 = Math.min(cp.y, p.y), y1 = Math.max(cp.y, p.y);
            let n = 0;
            for (let x = Math.ceil(x0 / stx - 1e-9) * stx; x <= x1 + 1e-9 && n < 300; x += stx, n++) { d += 'M' + P({ x: x, y: y0 }) + 'L' + P({ x: x, y: y1 }) + ' '; }
            for (let y = Math.ceil(y0 / sty - 1e-9) * sty, m = 0; y <= y1 + 1e-9 && m < 300; y += sty, m++) { d += 'M' + P({ x: x0, y: y }) + 'L' + P({ x: x1, y: y }) + ' '; }
            cp = p;
        }
        pend = null;
    }

    let i = 0, relMode = 0;
    while (i < s.length) {
        const c = s[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === '+') {
            relMode = s[i + 1] === '+' ? 2 : 1; i += relMode; i = skipWs(i);
            if (s[i] !== '(') { relMode = 0; }
            continue;
        }
        if (c === '(') {
            const e = tkMatch(s, i, '(', ')'); const raw = s.slice(i + 1, e); i = e + 1;
            let p = tkCoord(raw, ctx);
            if (relMode) {
                const b = relMode === 2 ? cp : rel;
                if (!b) { throw new Error('tọa độ tương đối cần có điểm bắt đầu'); }
                p = { x: b.x + p.x, y: b.y + p.y };
                if (relMode === 2) { rel = p; }
                relMode = 0;
            } else { rel = p; }
            apply(p); continue;
        }
        if (c === '[') { i = tkMatch(s, i, '[', ']') + 1; continue; }
        if (c === '{') { i = tkMatch(s, i, '{', '}') + 1; continue; }
        if (s.startsWith('--', i)) { pend = '--'; i += 2; continue; }
        if (s.startsWith('-|', i)) { pend = '-|'; i += 2; continue; }
        if (s.startsWith('|-', i)) { pend = '|-'; i += 2; continue; }
        if (s.startsWith('..', i)) {
            i += 2;
            if (!bez) { bez = { pts: [], closing: false }; } else if (bez.pts.length > 0) { bez.closing = true; }
            continue;
        }
        const w = /^[a-zA-Z]+/.exec(s.slice(i));
        if (!w) { i++; continue; }
        i += w[0].length;
        const kw = w[0];
        if (kw === 'cycle') { if (cp) { d += 'Z '; cp = start; } pend = null; }
        else if (kw === 'rectangle') { pend = 'rect'; }
        else if (kw === 'to') { pend = '--'; }
        else if (kw === 'grid') {
            i = skipWs(i); let gs = { grid: true, sx: 1, sy: 1 };
            if (s[i] === '[') {
                const e = tkMatch(s, i, '[', ']'); const go = tkOpts(s.slice(i + 1, e)); i = e + 1;
                if (go.step) { gs.sx = gs.sy = tkEval(go.step) * ctx.sc; }
                if (go.xstep) { gs.sx = tkEval(go.xstep) * ctx.sc; } if (go.ystep) { gs.sy = tkEval(go.ystep) * ctx.sc; }
            }
            if (gs.sx <= 0 || gs.sy <= 0) { throw new Error('bước lưới phải > 0'); }
            pend = gs;
        }
        else if (kw === 'circle' || kw === 'ellipse') {
            needCp(); i = skipWs(i); let ro = {};
            if (s[i] === '[') { const e = tkMatch(s, i, '[', ']'); ro = tkOpts(s.slice(i + 1, e)); i = e + 1; i = skipWs(i); }
            let raw = ro.radius || '';
            if (s[i] === '(') { const e = tkMatch(s, i, '(', ')'); raw = s.slice(i + 1, e); i = e + 1; }
            const pr = raw.split(/\band\b/);
            const rx = tkEval(pr[0]) * ctx.sc, ry = pr[1] ? tkEval(pr[1]) * ctx.sc : rx;
            const cx = cp.x * S, cy = -cp.y * S, a = rx * S, b = ry * S;
            ctx.bbPt(cx - a, cy - b); ctx.bbPt(cx + a, cy + b);
            d += 'M' + tkNum(cx + a) + ' ' + tkNum(cy) + 'A' + tkNum(a) + ' ' + tkNum(b) + ' 0 1 0 ' + tkNum(cx - a) + ' ' + tkNum(cy) +
                 'A' + tkNum(a) + ' ' + tkNum(b) + ' 0 1 0 ' + tkNum(cx + a) + ' ' + tkNum(cy) + 'Z ';
        }
        else if (kw === 'arc') {
            needCp(); i = skipWs(i);
            if (s[i] !== '(') { throw new Error('arc cần dạng (góc đầu:góc cuối:bán kính)'); }
            const e = tkMatch(s, i, '(', ')'); const q = tkSplit(s.slice(i + 1, e), ':'); i = e + 1;
            if (q.length !== 3) { throw new Error('arc cần dạng (góc đầu:góc cuối:bán kính)'); }
            const a0 = tkEval(q[0]), a1 = tkEval(q[1]), pr = q[2].split(/\band\b/);
            const rx = tkEval(pr[0]) * ctx.sc, ry = pr[1] ? tkEval(pr[1]) * ctx.sc : rx;
            const rad = Math.PI / 180;
            const ctr = { x: cp.x - rx * Math.cos(a0 * rad), y: cp.y - ry * Math.sin(a0 * rad) };
            const en = { x: ctr.x + rx * Math.cos(a1 * rad), y: ctr.y + ry * Math.sin(a1 * rad) };
            ctx.bbPt((ctr.x - rx) * S, -(ctr.y + ry) * S); ctx.bbPt((ctr.x + rx) * S, -(ctr.y - ry) * S);
            d += 'A' + tkNum(rx * S) + ' ' + tkNum(ry * S) + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' ' + (a1 > a0 ? 0 : 1) + ' ' + P(en) + ' ';
            cp = en;
        }
        else if (kw === 'node') {
            const n = { opts: {}, text: '', pos: null }; let at = null, name = null, got = false;
            while (i < s.length && !got) {
                i = skipWs(i);
                if (s[i] === '[') { const e = tkMatch(s, i, '[', ']'); Object.assign(n.opts, tkOpts(s.slice(i + 1, e))); i = e + 1; }
                else if (s[i] === '(') { const e = tkMatch(s, i, '(', ')'); name = s.slice(i + 1, e).trim(); i = e + 1; }
                else if (/^at(?![a-zA-Z])/.test(s.slice(i))) {
                    i = skipWs(i + 2);
                    if (s[i] !== '(') { throw new Error('thiếu tọa độ sau "at"'); }
                    const e = tkMatch(s, i, '(', ')'); at = tkCoord(s.slice(i + 1, e), ctx); i = e + 1;
                }
                else if (s[i] === '{') { const e = tkMatch(s, i, '{', '}'); n.text = s.slice(i + 1, e); i = e + 1; got = true; }
                else { throw new Error('node viết sai cú pháp'); }
            }
            let pos = at;
            if (!pos) {
                pos = cp || { x: 0, y: 0 };
                let t = null;
                if (n.opts.midway) { t = 0.5; } if (n.opts['at start']) { t = 0; } if (n.opts['at end']) { t = 1; }
                if (n.opts['near start']) { t = 0.25; } if (n.opts['near end']) { t = 0.75; }
                if (typeof n.opts.pos === 'string') { t = parseFloat(n.opts.pos); }
                if (t !== null && !isNaN(t) && lastSeg) { pos = { x: lastSeg.a.x + (lastSeg.b.x - lastSeg.a.x) * t, y: lastSeg.a.y + (lastSeg.b.y - lastSeg.a.y) * t }; }
            }
            n.pos = pos; if (name) { ctx.names[name] = pos; }
            nodes.push(n);
        }
        // các từ khác (controls, and, edge, ...) được bỏ qua
    }

    if (d.trim() !== '' && (st.draw || st.fill)) {
        let a = 'd="' + d.trim() + '" fill="' + (st.fill || 'none') + '"';
        if (st.fill) { a += ' fill-opacity="' + (st.fop * st.op) + '"'; }
        if (st.draw) {
            a += ' stroke="' + st.stroke + '" stroke-width="' + tkNum(st.lw) + '" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="' + (st.dop * st.op) + '"';
            if (st.dash) { a += ' stroke-dasharray="' + st.dash + '"'; }
            if (st.a1) { a += ' marker-end="url(#' + tkMarker(ctx, st.stroke) + ')"'; }
            if (st.a0) { a += ' marker-start="url(#' + tkMarker(ctx, st.stroke) + ')"'; }
        } else { a += ' stroke="none"'; }
        ctx.out.push('<path ' + a + '/>');
    }
    nodes.forEach(function (n) { ctx.out.push(tkNodeSvg(n, ctx)); });
}
