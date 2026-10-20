

// Vẽ đường cong y = f(x) (lệnh plot trong TikZ): lấy mẫu theo domain và samples
function tkPlot(rest, optRaw, opts, ctx, cmd) {
    let r = rest.replace(/^\s*plot\s*/, '');
    let po = {};
    if (r[0] === '[') { const e = tkMatch(r, 0, '[', ']'); po = tkOpts(r.slice(1, e)); r = r.slice(e + 1).trim(); }
    const tatCa = tkOpts(optRaw || '');
    const mien = String(po.domain || tatCa.domain || '').trim();
    const md = /^(.+?):(.+)$/.exec(mien);
    if (!md) { throw new Error('plot cần domain=a:b'); }
    const a = tkEval(md[1]), b = tkEval(md[2]);
    const n = Math.max(2, Math.min(400, parseInt(po.samples || tatCa.samples || '25', 10) || 25));
    if (r[0] !== '(') { throw new Error('plot viết sai cú pháp'); }
    const e = tkMatch(r, 0, '(', ')');
    const phan = tkSplit(r.slice(1, e), ',').map(function (s) { s = s.trim(); return /^\{[\s\S]*\}$/.test(s) ? s.slice(1, -1) : s; });
    if (phan.length !== 2) { throw new Error('plot chỉ hỗ trợ hình 2D (x, y)'); }
    const pts = [];
    for (let k = 0; k < n; k++) {
        const t = a + (b - a) * k / (n - 1);
        const thay = function (bt) { return tkEval(bt.replace(/\\x/g, '(' + t.toFixed(6) + ')')); };
        const x = thay(phan[0]), y = thay(phan[1]);
        if (!isFinite(x) || !isFinite(y)) { continue; }
        pts.push('(' + x.toFixed(4) + ',' + y.toFixed(4) + ')');
    }
    if (pts.length < 2) { throw new Error('plot không có điểm nào để vẽ'); }
    tkPath(pts.join(' -- '), ctx, cmd === 'fill' || cmd === 'filldraw' ? cmd : 'draw', opts);
}

// Đánh dấu góc \tkzMarkAngle(P,V,Q) và ghi nhãn \tkzLabelAngle(P,V,Q){nhãn}
function tkMarkAngle(bo, opts, ctx, nhan) {
    const ten = String(bo || '').split(',').map(function (s) { return s.trim(); });
    if (ten.length !== 3) { throw new Error('góc cần 3 điểm (P,V,Q)'); }
    const diem = function (nm) {
        const p = ctx.names[nm.split('.')[0]];
        if (!p) { throw new Error('chưa có điểm tên "' + nm + '"'); }
        return { x: p.x / ctx.sc, y: p.y / ctx.sc };
    };
    const P = diem(ten[0]), V = diem(ten[1]), Q = diem(ten[2]);
    const a1 = Math.atan2(P.y - V.y, P.x - V.x);
    let delta = Math.atan2(Q.y - V.y, Q.x - V.x) - a1;
    while (delta > Math.PI) { delta -= 2 * Math.PI; }
    while (delta < -Math.PI) { delta += 2 * Math.PI; }
    const r = opts.size ? tkEval(opts.size) : 0.6;
    const mau = opts.color || 'black';
    if (nhan === null) {
        const cung = [];
        for (let k = 0; k <= 12; k++) {
            const g = a1 + delta * k / 12;
            cung.push('(' + (V.x + r * Math.cos(g)).toFixed(4) + ',' + (V.y + r * Math.sin(g)).toFixed(4) + ')');
        }
        tkPath(cung.join(' -- '), ctx, 'draw', { color: mau, thin: true });
    } else {
        const g = a1 + delta / 2, rn = r * 1.6;
        tkPath('node at (' + (V.x + rn * Math.cos(g)).toFixed(4) + ',' + (V.y + rn * Math.sin(g)).toFixed(4) + ') {' + nhan + '}', ctx, 'path', { color: mau });
    }
}


// =====================================================
//  BẢNG BIẾN THIÊN (gói tkz-tab): \tkzTabInit, \tkzTabLine, \tkzTabVar
// =====================================================
function tkTabNhan(s) {
    return String(s).trim().replace(/^\$|\$$/g, '').replace(/\\infty/g, '∞').replace(/\\/g, '').replace(/[{}]/g, '').replace(/'/g, '′').trim();
}
function tkTabDongBoPhan(nd) { return String(nd).split(','); }
function tkTabInit(st, ctx) {
    const m = /^\\tkzTabInit(?![a-zA-Z])\s*(\[[^\]]*\])?\s*/.exec(st);
    const r1 = st.slice(m[0].length);
    const g1 = nhomCan(r1, 0); if (!g1) { throw new Error('tkzTabInit thiếu nhóm nhãn hàng'); }
    const g2 = nhomCan(r1.slice(g1.het).trim(), 0); if (!g2) { throw new Error('tkzTabInit thiếu nhóm giá trị x'); }
    const hang = tkTabDongBoPhan(g1.nd).map(function (p) {
        const q = p.split('/');
        return { nhan: tkTabNhan(q[0]), h: q[1] ? (parseFloat(q[1]) || 0.6) : 0.6 };
    });
    const xs = tkTabDongBoPhan(g2.nd).map(tkTabNhan);
    ctx.tab = { hang: hang, xs: xs, dong: null, bien: null };
}
function tkTabLine(st, ctx) {
    if (!ctx.tab) { throw new Error('tkzTabLine cần tkzTabInit đứng trước'); }
    const r = st.replace(/^\\tkzTabLine(?![a-zA-Z])\s*/, '');
    const g = nhomCan(r, 0); if (!g) { throw new Error('tkzTabLine thiếu { }'); }
    ctx.tab.dong = tkTabDongBoPhan(g.nd).map(function (x) { return x.trim(); });
}
function tkTabVar(st, ctx) {
    if (!ctx.tab) { throw new Error('tkzTabVar cần tkzTabInit đứng trước'); }
    const r = st.replace(/^\\tkzTabVar(?![a-zA-Z])\s*/, '');
    const g = nhomCan(r, 0); if (!g) { throw new Error('tkzTabVar thiếu { }'); }
    ctx.tab.bien = tkTabDongBoPhan(g.nd).map(function (e) { return e.trim().split('/').map(function (x) { return x.trim(); }); });
    tkTabVe(ctx);
}
function tkTabVe(ctx) {
    const T = ctx.tab, n = T.xs.length, cm = TK_PX;
    const colW = 2.4 * cm, labW = 1.2 * cm;
    const hs = T.hang.map(function (r) { return r.h * cm * 1.1; });
    const rowY = []; let yy = 0; hs.forEach(function (hh) { rowY.push(yy); yy += hh; });
    const Ht = yy, Wt = labW + colW * n;
    const X = function (i) { return labW + colW * (i + 0.5); };
    const isD = function (i) { return !!(T.bien[i] && /D/.test(T.bien[i][0])); };
    const dau = function (i) { return (T.bien[i][0] || '').replace(/D/g, '').replace(/\s/g, '')[0] || ''; };
    const out = [];
    const mk = tkMarker(ctx, '#000');
    const line = function (x1, y1, x2, y2, ex) { out.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#000" stroke-width="1.3" ' + (ex || '') + '/>'); };
    const text = function (x, y, s, ex) { const w = Math.max(10, s.length * 9); out.push('<rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y - 9).toFixed(1) + '" width="' + w.toFixed(1) + '" height="18" fill="#fff"/>'); out.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="15" font-family="Times New Roman,serif" fill="#111" ' + (ex || '') + '>' + s + '</text>'); };
    // Khung ngang và dọc
    rowY.forEach(function (y) { line(0, y, Wt, y); });
    line(0, Ht, Wt, Ht); line(0, 0, 0, Ht); line(Wt, 0, Wt, Ht);
    line(labW, 0, labW, Ht);
    for (let i = 0; i < n; i++) { if (i > 0) { line(labW + colW * i, 0, labW + colW * i, Ht); } }
    // Nhãn hàng
    T.hang.forEach(function (r, k) { text(labW / 2, rowY[k] + hs[k] / 2, r.nhan); });
    // Hàng x: giá trị
    T.xs.forEach(function (s, i) { text(X(i), rowY[0] + hs[0] / 2, s); });
    // Hàng y': dấu và điểm 0 / không xác định
    const yP = 1, yY = T.hang.length - 1;
    if (T.dong) {
        T.dong.forEach(function (ch, j) {
            if (j % 2 === 0) {
                const p = j / 2; if (p >= n) { return; }
                if (ch === 'd') { const ym = rowY[yP] + hs[yP] / 2; line(X(p) - 2.5, ym - 7, X(p) - 2.5, ym + 7); line(X(p) + 2.5, ym - 7, X(p) + 2.5, ym + 7); }
                else if (ch === '0') { text(X(p), rowY[yP] + hs[yP] / 2, '0'); }
            } else {
                const q = (j - 1) / 2; if (q + 1 >= n) { return; }
                if (ch === '+' || ch === '-') { text((X(q) + X(q + 1)) / 2, rowY[yP] + hs[yP] / 2, ch === '+' ? '+' : '−'); }
            }
        });
    }
    // Hàng y: giá trị và mũi tên
    const yTop = rowY[yY] + hs[yY] * 0.3, yBot = rowY[yY] + hs[yY] * 0.7, yMid = rowY[yY] + hs[yY] / 2;
    for (let i = 0; i < n; i++) {
        const v = (T.bien[i] || []).slice(1).map(tkTabNhan);
        if (isD(i)) {
            line(X(i) - 3, rowY[yY], X(i) - 3, rowY[yY] + hs[yY]);
            line(X(i) + 3, rowY[yY], X(i) + 3, rowY[yY] + hs[yY]);
            if (v[0] !== undefined) { text(X(i), yTop, v[0]); }
            if (v[1] !== undefined) { text(X(i), yBot, v[1]); }
        } else if (v[0] !== undefined) { text(X(i), yMid, v[0]); }
    }
    // Mũi tên giữa các điểm
    for (let i = 0; i + 1 < n; i++) {
        const s = (T.dong && T.dong[2 * i + 1] && /^[+-]$/.test(T.dong[2 * i + 1])) ? T.dong[2 * i + 1] : dau(i + 1);
        const tang = s === '+';
        let x1, y1, x2, y2;
        if (isD(i)) { x1 = X(i) + 6; y1 = tang ? yTop : yBot; }
        else { x1 = X(i) + 16; y1 = tang ? yBot : yTop; }
        if (isD(i + 1)) { x2 = X(i + 1) - 6; y2 = tang ? yTop : yBot; }
        else { x2 = X(i + 1) - 16; y2 = tang ? yTop : yBot; }
        line(x1, y1, x2, y2, 'marker-end="url(#' + mk + ')"');
    }
    ctx.out.push('<g>' + out.join('') + '</g>');
    ctx.bbPt(0, 0); ctx.bbPt(Wt, Ht);
    T.bo = { X: X, rowY: rowY, hs: hs, n: n, text: text };
}


// \tkzTabVal{i}{j}{t}{hàng}{nhãn}: ghi giá trị giữa cột i và j, ở vị trí t (0..1), trên hàng số "hàng"
function tkTabVal(st, ctx) {
    if (!ctx.tab || !ctx.tab.bo) { throw new Error('tkzTabVal cần đặt sau tkzTabVar'); }
    const r = st.replace(/^\\tkzTabVal(?![a-zA-Z])\s*/, '');
    const a = [], g = [];
    let pos = 0;
    for (let k = 0; k < 5; k++) {
        pos = boKhoang(r, pos);
        const e = nhomCan(r, pos); if (!e) { throw new Error('tkzTabVal thiếu tham số'); }
        a.push(e.nd.trim()); pos = e.het;
    }
    const i = parseInt(a[0], 10), j = parseInt(a[1], 10), t = parseFloat(a[2]), hang = parseInt(a[3], 10);
    const B = ctx.tab.bo;
    const x1 = B.X(i - 1), x2 = B.X(j - 1);
    const xv = x1 + (x2 - x1) * (isNaN(t) ? 0.5 : t);
    const yv = B.rowY[hang - 1] + B.hs[hang - 1] / 2;
    B.text(xv, yv, tkTabNhan(a[4]));
}

function tkRun(text, ctx, depth) {
    if (depth > 4) { throw new Error('\\foreach lồng nhau quá sâu'); }
    text = String(text).replace(/(\\(?:def|pgfmathsetmacro|definecolor|tkzTabInit|tkzTabLine|tkzTabVar|tkzTabVal|tkzLabelAngle)(?![a-zA-Z])[^;]*?\})(?=\s*\\)/g, '$1;');
    tkSplit(text, ';').forEach(function (st0) {
        let st = st0.trim(); if (st === '') { return; }
        if (++ctx.count > 3000) { throw new Error('hình vẽ quá phức tạp'); }
        // Không thay biến vào tên biến đang được định nghĩa (\\side trong \\pgfmathsetmacro{\\side}{...})
        const dau = /^(\\pgfmathsetmacro\s*\{\\[a-zA-Z]+\}|\\def\s*\\[a-zA-Z]+)/.exec(st);
        const phanDau = dau ? dau[0] : '', phanSau = dau ? st.slice(dau[0].length) : st;
        let thaySau = phanSau;
        Object.keys(ctx.vars).sort(function (a, b) { return b.length - a.length; }).forEach(function (v) { thaySau = tkSub(thaySau, v, ctx.vars[v]); });
        st = phanDau + thaySau;
        try {
            let m;
            if (/^\\foreach(?![a-zA-Z])/.test(st)) {
                m = /^\\foreach\s+(\\[a-zA-Z]+)(?:\s*\/\s*(\\[a-zA-Z]+))?\s*in\s*/.exec(st);
                if (!m) { throw new Error('\\foreach viết sai cú pháp'); }
                let rest = st.slice(m[0].length);
                if (rest[0] !== '{') { throw new Error('\\foreach cần danh sách trong { }'); }
                const g = nhomCan(rest, 0); if (!g) { throw new Error('\\foreach thiếu dấu }'); }
                let body, after = '';
                const r2 = rest.slice(g.het).trim();
                if (r2[0] === '{') { const g2 = nhomCan(r2, 0); if (!g2) { throw new Error('thân \\foreach thiếu dấu }'); } body = g2.nd; after = r2.slice(g2.het); } else { body = r2; }
                tkForVals(g.nd).forEach(function (v) {
                    let b = body;
                    if (m[2]) { const pr = v.split('/'); b = tkSub(tkSub(b, m[1], (pr[0] || '').trim()), m[2], (pr[1] || '').trim()); }
                    else { b = tkSub(b, m[1], v); }
                    tkRun(b + ';', ctx, depth + 1);
                });
                if (after.trim() !== '') { tkRun(after, ctx, depth); }
            } else if ((m = /^\\(draw|fill|filldraw|path|node|shade|shadedraw)(?![a-zA-Z])\s*/.exec(st))) {
                const cmd = m[1]; let rest = st.slice(m[0].length), opts = {}, optRaw = '';
                if (cmd === 'node') { rest = 'node ' + rest; }
                else if (rest[0] === '[') { const e = tkMatch(rest, 0, '[', ']'); optRaw = rest.slice(1, e); opts = tkOpts(optRaw); rest = rest.slice(e + 1); }
                if (/^\s*plot(?![a-zA-Z])/.test(rest)) { tkPlot(rest, optRaw, opts, ctx, cmd); }
                else { tkPath(rest, ctx, cmd === 'node' ? 'path' : cmd, opts); }
            } else if (/^\\coordinate(?![a-zA-Z])/.test(st)) {
                const mm = /^\\coordinate\s*(?:\[[^\]]*\])?\s*\(([^)]+)\)\s*at\s*\(/.exec(st);
                if (!mm) { throw new Error('\\coordinate viết sai cú pháp'); }
                const from = mm[0].length - 1; const e = tkMatch(st, from, '(', ')');
                ctx.names[mm[1].trim()] = tkCoord(st.slice(from + 1, e), ctx);
            } else if ((m = /^\\definecolor\s*\{([a-zA-Z]+)\}\s*\{(RGB|rgb|HTML)\}\s*\{([^}]*)\}$/.exec(st))) {
                if (m[2] === 'HTML') { TK_COL[m[1]] = '#' + m[3].trim().replace('#', ''); }
                else {
                    const v = m[3].split(',').map(function (x) { return Math.max(0, Math.min(255, Math.round(parseFloat(x) || 0))); });
                    TK_COL[m[1]] = '#' + v.map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
                }
            } else if (/^\\tkzTabInit(?![a-zA-Z])/.test(st)) {
                tkTabInit(st, ctx);
            } else if (/^\\tkzTabLine(?![a-zA-Z])/.test(st)) {
                tkTabLine(st, ctx);
            } else if (/^\\tkzTabVar(?![a-zA-Z])/.test(st)) {
                tkTabVar(st, ctx);
            } else if (/^\\tkzTabVal(?![a-zA-Z])/.test(st)) {
                tkTabVal(st, ctx);
            } else if ((m = /^\\tkzMarkAngle(?![a-zA-Z])\s*(\[[^\]]*\])?\s*\(([^)]*)\)/.exec(st))) {
                tkMarkAngle(m[2], m[1] ? tkOpts(m[1].slice(1, -1)) : {}, ctx, null);
            } else if ((m = /^\\tkzLabelAngle(?![a-zA-Z])\s*(\[[^\]]*\])?\s*\(([^)]*)\)\s*\{/.exec(st))) {
                const br = st.indexOf('{', m[0].length - 1), e = tkMatch(st, br, '{', '}');
                tkMarkAngle(m[2], m[1] ? tkOpts(m[1].slice(1, -1)) : {}, ctx, st.slice(br + 1, e));
            } else if ((m = /^\\def\s*(\\[a-zA-Z]+)\s*\{([\s\S]*)\}$/.exec(st))) {
                ctx.vars[m[1]] = m[2];
            } else if ((m = /^\\pgfmathsetmacro\s*\{(\\[a-zA-Z]+)\}\s*\{([\s\S]*)\}$/.exec(st))) {
                ctx.vars[m[1]] = tkNum(tkEval(m[2]));
            } else if (/^\\(usetikzlibrary|tikzset|begin|end|centering|small|large|footnotesize|clip)/.test(st)) {
                if (/^\\clip/.test(st)) { ctx.warn.push('\\clip (cắt hình) chưa được hỗ trợ'); }
            } else {
                ctx.warn.push('chưa hỗ trợ lệnh: ' + st.slice(0, 28) + (st.length > 28 ? '…' : ''));
            }
        } catch (e) {
            ctx.warn.push(e.message + ' — trong: ' + st.slice(0, 32) + (st.length > 32 ? '…' : ''));
        }
    });
}

function tkSvg(src, optStr) {
    const ctx = { names: {}, vars: {}, out: [], markers: {}, warn: [], sc: 1, uid: ++TK_UID, count: 0,
                  bb: { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 } };
    ctx.bbPt = function (x, y) { const b = ctx.bb; b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); };
    try {
        const po = tkOpts((optStr || '').replace(/^\[|\]$/g, ''));
        if (po.scale) { ctx.sc = tkEval(po.scale); }
        tkRun(src.replace(/(^|[^\\])%.*$/gm, '$1'), ctx, 0);
    } catch (e) { ctx.warn.push(e.message); }
    let html = '';
    const b = ctx.bb;
    if (b.x0 <= b.x1) {
        const pad = 10, x0 = b.x0 - pad, y0 = b.y0 - pad, w = b.x1 - b.x0 + 2 * pad, h = b.y1 - b.y0 + 2 * pad;
        const defs = Object.keys(ctx.markers).map(function (c) {
            return '<marker id="' + ctx.markers[c] + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L10,5 L0,10 z" fill="' + c + '"/></marker>';
        }).join('');
        html = '<svg class="tk-svg" xmlns="http://www.w3.org/2000/svg" viewBox="' + [x0, y0, w, h].map(tkNum).join(' ') + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '" style="max-width:100%;height:auto;overflow:visible">' +
               (defs ? '<defs>' + defs + '</defs>' : '') + ctx.out.join('') + '</svg>';
    }
    if (ctx.warn.length) {
        html += '<div class="tk-warn">⚠ ' + ctx.warn.slice(0, 3).map(thoat).join('<br>⚠ ') + (ctx.warn.length > 3 ? '<br>… và ' + (ctx.warn.length - 3) + ' cảnh báo khác' : '') + '</div>';
    }
    return '<div class="tk-wrap">' + (html || '<div class="tk-warn">Hình TikZ chưa có nét vẽ nào.</div>') + '</div>';
}

window.__labFns = { tex: tex, loaiCau: loaiCau, daLam: daLam, chamCau: chamCau, cauGon: (typeof cauGon === 'function' ? cauGon : null) };

// Bảng \begin{tabular}{...} ... \end{tabular} thành bảng HTML (có \hline, \multicolumn, |)
function tkTabularHTML(spec, body, opt) {
    const cot = []; let k = 0;
    const spec2 = String(spec).replace(/\s/g, '');
    const viền = []; let bar = 0;
    for (let c = 0; c < spec2.length; c++) {
        const ch = spec2[c];
        if (ch === '|') { bar++; continue; }
        if (/[lcr]/.test(ch)) { cot.push({ al: ch, tr: bar }); bar = 0; }
    }
    viền.push(bar);
    const cuoi = bar;
    let rows = String(body).replace(/\\\\(?![a-zA-Z])/g, '\u0001');
    rows = rows.split('\u0001');
    let html = '<table class="tk-tabular"><tbody>';
    rows.forEach(function (dong, idx) {
        let d = dong.trim();
        const dau = [];
        while (/^\\hline(?![a-zA-Z])/.test(d)) { dau.push(1); d = d.replace(/^\\hline(?![a-zA-Z])\s*/, ''); }
        d = d.replace(/\\\[[^\]]*\]$/, '').trim();
        if (d === '') {
            // Dòng trống chỉ có \hline: kẻ đường ngang ở đáy dòng trước, không tạo dòng mới
            if (dau.length && html.lastIndexOf('<tr') > html.lastIndexOf('</tbody>')) { html = html.replace(/<\/tr>$/, '</tr>'); }
            if (dau.length) { html = html.replace(/<tr([^>]*)>((?:(?!<tr)[\s\S])*)$/, function (mm, a, b2) { return '<tr' + a.replace(/ class="tk-hl-sau"/, '') + ' class="tk-hl-sau"' + '>' + b2; }); }
            return;
        }
        const ocLast = /\\hline\s*$/.test(dong.trim());
        const tr = [];
        let cell = 0;
        const oc = d.split('&');
        oc.forEach(function (o) {
            let span = 1, al = null, nd = o.trim();
            const mc = /^\\multicolumn\s*\{(\d+)\}\s*\{([^}]*)\}\s*\{([\s\S]*)\}\s*$/.exec(nd);
            if (mc) { span = parseInt(mc[1], 10); al = mc[2].replace(/[|\s]/g, '')[0] || 'c'; nd = mc[3].trim(); }
            tr.push({ span: span, al: al, nd: nd });
        });
        html += '<tr' + (dau.length ? ' class="tk-hl"' : '') + (ocLast ? ' class="tk-hl-sau"' : '') + '>';
        tr.forEach(function (ce) {
            const cl = cot[cell] || { al: 'c', tr: 0 };
            const al = ce.al || cl.al;
            const al2 = al === 'l' ? 'left' : al === 'r' ? 'right' : 'center';
            const cuoiCot = cell + ce.span - 1;
            const vTrai = cl.tr > 0 ? 'border-left:1.2px solid #000;' : '';
            const vPhai = (cuoiCot + 1 < cot.length ? cot[cuoiCot + 1].tr > 0 : cuoi > 0) ? 'border-right:1.2px solid #000;' : '';
            html += '<td colspan="' + ce.span + '" style="text-align:' + al2 + ';' + vTrai + vPhai + '">' + tex(ce.nd, opt) + '</td>';
            cell += ce.span;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}
// Đưa môi trường toán (array, cases, matrix, ...) ra ngoài dấu $ nếu chưa nằm trong công thức
function tkBaoToanMoiTruong(s) {
    return s.replace(/\\begin\{(array|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|align\*?|gathered)\}[\s\S]*?\\end\{\1\}/g, function (m, ten, off, all) {
        const truoc = all.slice(0, off).replace(/\\\$/g, '');
        const soDola = (truoc.match(/\$/g) || []).length;
        return soDola % 2 === 1 ? m : '$$' + m + '$$';
    });
}

function tex(s, opt) {
    opt = opt || {};
    s = String(s === undefined || s === null ? '' : s);
    const H = [];
    const giu = function (h) { H.push(h); return '\u0002' + (H.length - 1) + '\u0003'; };
    // 1. \immini{chữ}{hình}: chữ bên trái, hình bên phải
    let k;
    while ((k = s.search(/\\immini(?![a-zA-Z])/)) !== -1) {
        let i = boKhoang(s, k + 7);
        if (s[i] === '[') { const e = s.indexOf(']', i); i = boKhoang(s, e === -1 ? i + 1 : e + 1); }
        const g1 = s[i] === '{' ? nhomCan(s, i) : null;
        if (!g1) { s = s.slice(0, k) + s.slice(k + 7); continue; }
        const j = boKhoang(s, g1.het), g2 = s[j] === '{' ? nhomCan(s, j) : null;
        if (!g2) { s = s.slice(0, k) + g1.nd + s.slice(g1.het); continue; }
        s = s.slice(0, k) + giu('<div class="tk-immini"><div>' + tex(g1.nd, opt) + '</div><div>' + tex(g2.nd, opt) + '</div></div>') + s.slice(g2.het);
    }
    // 1b. bảng tabular
    s = s.replace(/\\begin\{tabular\}\s*\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g, function (m, spec, body) { return giu(tkTabularHTML(spec, body, opt)); });
    // 1c. môi trường toán ngoài dấu $
    s = tkBaoToanMoiTruong(s);
    // 2. môi trường tikzpicture
    let coHinh = false;
    s = s.replace(/\\begin\{tikzpicture\}(\[[^\]]*\])?([\s\S]*?)\\end\{tikzpicture\}/g, function (m, o, body) {
        coHinh = true;
        return giu(opt.khongHinh ? '<i class="tk-ph">[hình vẽ TikZ]</i>' : tkSvg(body, o || ''));
    });
    // 3. dán lệnh \draw... mà quên \begin{tikzpicture}: tự bọc lại
    if (!coHinh && /\\(draw|fill|filldraw|node|coordinate|foreach)(?![a-zA-Z])/.test(s) && s.indexOf('\u0002') === -1) {
        const a = s.search(/\\(draw|fill|filldraw|node|coordinate|foreach)(?![a-zA-Z])/), z = s.lastIndexOf(';');
        if (z > a) {
            const body = s.slice(a, z + 1);
            s = s.slice(0, a) + giu(opt.khongHinh ? '<i class="tk-ph">[hình vẽ TikZ]</i>' : tkSvg(body, '')) + s.slice(z + 1);
        }
    }
    // 4. công thức toán và văn bản
    s = s.replace(/\\\$/g, '\u0001');
    const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
    let out = '', last = 0, m;
    while ((m = re.exec(s)) !== null) {
        out += vanBanTex(s.slice(last, m.index));
        const rieng = m[1] !== undefined || m[4] !== undefined;
        const nd = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
        out += toanHoc(nd, rieng);
        last = re.lastIndex;
    }
    out += vanBanTex(s.slice(last));
    return out.replace(/\u0002(\d+)\u0003/g, function (x, n) { return H[+n]; });
}

// ---------- Đọc mã LaTeX dạng ex_test: \begin{ex} ... \choice{}{}{}{} \loigiai{} \end{ex} ----------
function nhomCan(s, i) {                       // s[i] === '{' -> {nd, het}
    let d = 0;
    for (let j = i; j < s.length; j++) {
        const c = s[j];
        if (c === '\\') { j++; continue; }
        if (c === '{') { d++; }
        else if (c === '}') { d--; if (d === 0) { return { nd: s.slice(i + 1, j), het: j + 1 }; } }
    }
    return null;
}
function boKhoang(s, i) { while (i < s.length && /\s/.test(s[i])) { i++; } return i; }
function boChuThich(s) { return s.replace(/(^|[^\\])%.*$/gm, '$1'); }

// ---------- Các dạng câu hỏi: tn (trắc nghiệm) · ds (đúng/sai) · dien (điền khuyết) · keo (kéo thả) ----------
const LOAI_TEN = { tn: 'Trắc nghiệm', ds: 'Đúng / Sai', nhieu: 'Nhiều đáp án', dien: 'Điền khuyết', keo: 'Kéo thả' };
// true: câu nhiều ý / nhiều ô được tính điểm từng phần; false: phải đúng hết mới được điểm câu đó
const CHAM_TUNG_PHAN = true;
function loaiCau(q) { return q && q.loai && LOAI_TEN[q.loai] ? q.loai : 'tn'; }
function nhanLoai(q) { const lo = loaiCau(q); return lo === 'tn' ? '' : '<span class="lq-tag ' + lo + '">' + LOAI_TEN[lo] + '</span>'; }

// Tách các lệnh trong nội dung câu: điền khuyết \blank{đáp án}; kéo thả \drop{đáp án đúng} và \decoy{ô nhiễu}.
// Chỗ trống được thay bằng ký hiệu \u0004B<n>\u0005 (điền khuyết) hoặc \u0004D<n>\u0005 (kéo thả).
function tachCau(cau, loai) {
    const keo = loai === 'keo', o = [], nhieu = [];
    const re = keo ? /\\(drop|decoy)(?![a-zA-Z])/g : /\\(blank)(?![a-zA-Z])/g;
    let out = '', last = 0, m;
    while ((m = re.exec(cau)) !== null) {
        const j = boKhoang(cau, m.index + m[0].length);
        if (cau[j] !== '{') { continue; }
        const g = nhomCan(cau, j);
        if (!g) { continue; }
        out += cau.slice(last, m.index);
        if (m[1] === 'decoy') { nhieu.push(g.nd.trim()); }
        else { o.push(g.nd.trim()); out += '\u0004' + (keo ? 'D' : 'B') + (o.length - 1) + '\u0005'; }
        last = g.het; re.lastIndex = g.het;
    }
    return { text: out + cau.slice(last), o: o, nhieu: nhieu };
}
function dapAnChap(raw) { return String(raw).split('||').map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; }); }

// Hiển thị câu có chỗ trống: fnB(n, đápán) cho ô điền khuyết, fnD(n, đápán) cho ô kéo thả
function cauHTML(q, fnB, fnD, opt) {
    const t = tachCau(q.cau, loaiCau(q));
    const h = tex(t.text, opt).replace(/\u0004([BD])(\d+)\u0005/g, function (x, k, n) {
        return k === 'B' ? (fnB ? fnB(+n, t.o[+n]) : '') : (fnD ? fnD(+n, t.o[+n]) : '');
    });
    return { h: h, t: t };
}
function cauGon(q, opt) {            // câu hỏi dạng ngắn gọn: chỗ trống thành gạch dưới
    const lo = loaiCau(q);
    if (lo === 'dien' || lo === 'keo') {
        const g = function () { return '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>'; };
        return cauHTML(q, g, g, opt).h;
    }
    return tex(q.cau, opt);
}

// So khớp đáp án điền: không phân biệt hoa/thường, bỏ khoảng trắng, "1,5" = "1.5", -0 = 0...
function chuanHoa(s) {
    return String(s === undefined || s === null ? '' : s).normalize('NFC')
        .replace(/\\(?:dfrac|tfrac)(?![a-zA-Z])/g, '\\frac').replace(/\\(?:left|right)(?![a-zA-Z])/g, '')
        .replace(/\\[,;:! ]/g, '').replace(/∞/g, '\\infty').replace(/[−–—]/g, '-')
        .replace(/[$\s{}]/g, '').replace(/,/g, '.').toLowerCase();
}
function khopDapAn(nguoi, raw) {
    const n = chuanHoa(nguoi);
    if (n === '') { return false; }
    const so = /^-?\d+(\.\d+)?$/;
    return dapAnChap(raw).some(function (x) {
        const c = chuanHoa(x);
        return c === n || (so.test(c) && so.test(n) && parseFloat(c) === parseFloat(n));
    });
}

// Trạng thái bài làm ban đầu của một câu
function khoiTaoDapAn(q) {
    const lo = loaiCau(q);
    if (lo === 'nhieu') { return q.menh.map(function () { return false; }); }
    if (lo === 'ds') { return q.menh.map(function () { return null; }); }
    if (lo === 'dien' || lo === 'keo') { return tachCau(q.cau, lo).o.map(function () { return lo === 'dien' ? '' : -1; }); }
    return -1;
}
function daLam(q, a) {
    const lo = loaiCau(q);
    if (lo === 'tn') { return a !== -1; }
    if (lo === 'nhieu') { return a.some(function (x) { return x === true; }); }
    if (lo === 'ds') { return a.some(function (x) { return x !== null; }); }
    if (lo === 'dien') { return a.some(function (x) { return String(x).trim() !== ''; }); }
    return a.some(function (x) { return x !== -1; });
}
function taoChip(q) {               // kéo thả: các ô cần kéo = đáp án đúng + ô nhiễu, xáo trộn
    if (loaiCau(q) !== 'keo') { return null; }
    const t = tachCau(q.cau, 'keo'), ds = t.o.concat(t.nhieu).map(function (x) { return { t: x }; });
    for (let i = ds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), x = ds[i]; ds[i] = ds[j]; ds[j] = x; }
    return ds;
}

// Chấm một câu -> { diem: 0..1, ct: [chi tiết từng ý / ô] }
function chamCau(q, a, chips) {
    const lo = loaiCau(q), ct = [];
    if (lo === 'tn') { return { diem: a === q.dung ? 1 : 0, ct: ct }; }
    if (lo === 'nhieu') {   // chọn nhiều đáp án: điểm = (số đáp án đúng đã chọn - số ô chọn nhầm) / số đáp án đúng, không âm
        let trung = 0, nham = 0, can = 0;
        q.menh.forEach(function (m, i) {
            const chon = a[i] === true, ok = chon === !!m.dung;
            if (m.dung) { can++; if (chon) { trung++; } } else if (chon) { nham++; }
            ct.push({ ok: ok, nd: m.nd, nguoiH: chon ? 'Đã chọn' : '<i>(không chọn)</i>', dapAnH: m.dung ? 'Cần chọn' : 'Không chọn' });
        });
        let d;
        if (!CHAM_TUNG_PHAN) { d = (can > 0 && trung === can && nham === 0) ? 1 : 0; }
        else { d = can ? Math.max(0, (trung - nham) / can) : 0; }
        return { diem: d, ct: ct };
    }
    let dung = 0, tong = 0;
    if (lo === 'ds') {
        tong = q.menh.length;
        q.menh.forEach(function (m, i) {
            const ok = a[i] === m.dung; if (ok) { dung++; }
            ct.push({ ok: ok, nd: m.nd, nguoiH: a[i] === null ? '<i>(bỏ trống)</i>' : a[i] ? 'Đúng' : 'Sai', dapAnH: m.dung ? 'Đúng' : 'Sai' });
        });
    } else {
        const t = tachCau(q.cau, lo); tong = t.o.length;
        t.o.forEach(function (raw, i) {
            let ok, nguoiH;
            if (lo === 'dien') { const v = String(a[i] || ''); ok = khopDapAn(v, raw); nguoiH = v.trim() === '' ? '<i>(bỏ trống)</i>' : thoat(v); }
            else { const c = a[i] !== -1 && chips ? chips[a[i]] : null; ok = !!c && khopDapAn(c.t, raw); nguoiH = c ? tex(c.t) : '<i>(bỏ trống)</i>'; }
            if (ok) { dung++; }
            ct.push({ ok: ok, nguoiH: nguoiH, dapAnH: lo === 'dien' ? dapAnChap(raw).map(function (x) { return tex(x); }).join(' / ') : tex(raw) });
        });
    }
    let diem;
    if (!CHAM_TUNG_PHAN) { diem = dung === tong ? 1 : 0; }
    else if (lo === 'ds' && tong === 4) { diem = [0, 0.1, 0.25, 0.5, 1][dung]; }   // thang điểm đúng/sai 4 ý
    else { diem = tong ? dung / tong : 0; }
    return { diem: diem, ct: ct };
}

// Phần "xem lại" sau khi nộp bài cho một câu chưa đạt điểm tối đa
function xemLaiCau(q, stt, a, r) {
    const lo = loaiCau(q);
    let h = '<div class="rv"><div><b>Câu ' + stt + '.</b> ' + (lo === 'tn' ? '' : nhanLoai(q) + ' ') + (lo === 'dien' || lo === 'keo' ? cauGon(q) : tex(q.cau)) +
            (lo === 'tn' ? '' : '<span class="rv-score">(' + (Math.round(r.diem * 100) / 100) + ' / 1 điểm)</span>') + '</div>';
    if (lo === 'tn') {
        h += '<div class="rv-sai">Bạn chọn: ' + (a === -1 ? '(bỏ trống)' : tex(q.dapAn[a])) + '</div>' +
             '<div class="rv-dung">Đáp án đúng: ' + tex(q.dapAn[q.dung]) + '</div>';
    } else {
        h += '<div class="rv-part">' + r.ct.map(function (c, i) {
            const dau = c.ok ? '<span class="okk">✔</span>' : '<span class="nok">✖</span>';
            const ten = (lo === 'ds' || lo === 'nhieu') ? 'abcdefgh'.charAt(i) + ') ' + tex(c.nd) + (lo === 'ds' ? ' — Bạn chọn: ' : ' — Bạn: ') : 'Ô ' + (i + 1) + ': ' + (lo === 'dien' ? 'bạn điền ' : 'bạn thả ');
            return '<div>' + dau + ' ' + ten + '<b>' + c.nguoiH + '</b>' + (c.ok ? '' : ' · Đáp án: <b>' + c.dapAnH + '</b>') + '</div>';
        }).join('') + '</div>';
    }
    return h + (q.loiGiai ? '<div class="kh-ls"><b>Lời giải.</b> ' + tex(q.loiGiai) + '</div>' : '') + '</div>';
}

// Sao chép / gán các trường của câu hỏi (kể cả dạng mới)
function truongCau(x) {
    const r = { cau: x.cau, dapAn: x.dapAn || [], dung: typeof x.dung === 'number' ? x.dung : -1, loiGiai: x.loiGiai || '', nguon: x.nguon };
    if (x.loai && x.loai !== 'tn') { r.loai = x.loai; }
    if (x.menh) { r.menh = x.menh.map(function (m) { return { nd: m.nd, dung: !!m.dung }; }); }
    return r;
}
function ganCau(q, x) { delete q.loai; delete q.menh; Object.assign(q, truongCau(x)); }
function saoCau(q) { const r = truongCau(q); r.dapAn = r.dapAn.slice(); delete r.nguon; return r; }

// Đọc các dạng câu mới trong khối \begin{ex}; trả về null nếu là trắc nghiệm thường (\choice)
function phanTichDangMoi(body, loiGiai) {
    const mu = body.search(/\\choiceMulti(?![a-zA-Z])/);
    if (mu !== -1) {                                   // ---- Nhiều đáp án (chọn nhiều ô vuông) ----
        const cau = body.slice(0, mu).trim();
        if (cau === '') { return { loi: 'thiếu nội dung câu hỏi (phần trước \\choiceMulti).' }; }
        let i = boKhoang(body, mu + 12);
        if (body[i] === '[') { const e = body.indexOf(']', i); i = boKhoang(body, e === -1 ? i + 1 : e + 1); }
        const menh = []; let soDung = 0;
        while (body[i] === '{') {
            const g = nhomCan(body, i);
            if (!g) { return { loi: 'dấu { } ở đáp án ' + (menh.length + 1) + ' chưa đóng đúng.' }; }
            let nd = g.nd.trim(), dung = false;
            if (/^\\True(?![a-zA-Z])/.test(nd)) { nd = nd.replace(/^\\True\s*/, ''); dung = true; soDung++; }
            if (nd === '') { return { loi: 'đáp án ' + (menh.length + 1) + ' của \\choiceMulti đang để trống.' }; }
            menh.push({ nd: nd, dung: dung }); i = boKhoang(body, g.het);
        }
        if (menh.length < 2) { return { loi: '\\choiceMulti cần ít nhất 2 đáp án {..}; đáp án nào đúng thì thêm \\True ở đầu, ví dụ {\\True Đáp án đúng}.' }; }
        if (menh.length > 8) { return { loi: '\\choiceMulti tối đa 8 đáp án.' }; }
        if (soDung === 0) { return { loi: 'chưa đánh dấu đáp án đúng nào bằng \\True (câu nhiều đáp án cần ít nhất 1 đáp án đúng).' }; }
        return { loai: 'nhieu', cau: cau, menh: menh, dapAn: [], dung: -1, loiGiai: loiGiai };
    }
    const tf = body.search(/\\choiceTF(?![a-zA-Z])/);
    if (tf !== -1) {                                   // ---- Đúng / Sai ----
        const cau = body.slice(0, tf).trim();
        if (cau === '') { return { loi: 'thiếu nội dung câu hỏi (phần trước \\choiceTF).' }; }
        let i = boKhoang(body, tf + 9);
        if (body[i] === '[') { const e = body.indexOf(']', i); i = boKhoang(body, e === -1 ? i + 1 : e + 1); }
        const menh = [];
        while (body[i] === '{') {
            const g = nhomCan(body, i);
            if (!g) { return { loi: 'dấu { } ở ý ' + (menh.length + 1) + ' chưa đóng đúng.' }; }
            let nd = g.nd.trim(), dung = false;
            if (/^\\True(?![a-zA-Z])/.test(nd)) { nd = nd.replace(/^\\True\s*/, ''); dung = true; }
            if (nd === '') { return { loi: 'ý ' + (menh.length + 1) + ' của \\choiceTF đang để trống.' }; }
            menh.push({ nd: nd, dung: dung }); i = boKhoang(body, g.het);
        }
        if (menh.length < 2) { return { loi: '\\choiceTF cần ít nhất 2 ý {..}; ý nào đúng thì thêm \\True ở đầu, ví dụ {\\True Mệnh đề đúng}.' }; }
        if (menh.length > 8) { return { loi: '\\choiceTF tối đa 8 ý.' }; }
        return { loai: 'ds', cau: cau, menh: menh, dapAn: [], dung: -1, loiGiai: loiGiai };
    }
    if (/\\choice(?![a-zA-Z])/.test(body)) { return null; }
    const khungTrong = function (t) { return t.text.replace(/\u0004[BD]\d+\u0005/g, '').trim() === ''; };
    if (/\\drop(?![a-zA-Z])/.test(body)) {             // ---- Kéo thả ----
        const t = tachCau(body, 'keo');
        if (t.o.length === 0) { return { loi: 'lệnh \\drop cần có dạng \\drop{đáp án đúng}.' }; }
        if (t.o.some(function (x) { return x === ''; }) || t.nhieu.some(function (x) { return x === ''; })) { return { loi: 'có ô \\drop{} hoặc \\decoy{} đang để trống.' }; }
        if (khungTrong(t)) { return { loi: 'thiếu nội dung câu hỏi.' }; }
        return { loai: 'keo', cau: body.trim(), dapAn: [], dung: -1, loiGiai: loiGiai };
    }
    const sa = body.search(/\\shortans(?![a-zA-Z])/);
    if (sa !== -1 || /\\blank(?![a-zA-Z])/.test(body)) {   // ---- Điền khuyết ----
        let cau = body;
        if (sa !== -1) {
            const j = boKhoang(body, sa + 9), g = body[j] === '{' ? nhomCan(body, j) : null;
            if (!g) { return { loi: '\\shortans cần có dạng \\shortans{đáp án}.' }; }
            cau = (body.slice(0, sa) + body.slice(g.het)).trim() + ' \\blank{' + g.nd.trim() + '}';
        }
        cau = cau.trim();
        const t = tachCau(cau, 'dien');
        if (t.o.length === 0) { return { loi: 'lệnh \\blank cần có dạng \\blank{đáp án}.' }; }
        if (t.o.some(function (x) { return dapAnChap(x).length === 0; })) { return { loi: 'có ô \\blank{} đang để trống đáp án.' }; }
        if (khungTrong(t)) { return { loi: 'thiếu nội dung câu hỏi.' }; }
        return { loai: 'dien', cau: cau, dapAn: [], dung: -1, loiGiai: loiGiai };
    }
    return null;
}

function phanTichEx(body) {
    body = boChuThich(body);
    let loiGiai = '';
    const k = body.indexOf('\\loigiai');
    if (k !== -1) {
        const i = boKhoang(body, k + 8);
        if (body[i] === '{') {
            const g = nhomCan(body, i);
            if (g) { loiGiai = g.nd.trim(); body = body.slice(0, k) + body.slice(g.het); }
        }
    }
    const moi = phanTichDangMoi(body, loiGiai);
    if (moi) { return moi; }
    const c = body.search(/\\choice(?![a-zA-Z])/);
    if (c === -1) { return { loi: 'chưa nhận dạng được dạng câu: dùng \\choice (trắc nghiệm), \\choiceTF (đúng/sai), \\choiceMulti (nhiều đáp án), \\blank{} hoặc \\shortans{} (điền khuyết), \\drop{} (kéo thả).' }; }
    const cau = body.slice(0, c).trim();
    if (cau === '') { return { loi: 'thiếu nội dung câu hỏi (phần trước \\choice).' }; }
    let i = boKhoang(body, c + 7);
    if (body[i] === '[') { const e = body.indexOf(']', i); i = boKhoang(body, e === -1 ? i + 1 : e + 1); }
    const dapAn = []; let dung = -1, soDung = 0;
    for (let n = 0; n < 4; n++) {
        i = boKhoang(body, i);
        if (body[i] !== '{') { return { loi: 'chỉ tìm thấy ' + n + ' đáp án, cần đủ 4 nhóm {..}.' }; }
        const g = nhomCan(body, i);
        if (!g) { return { loi: 'dấu { } ở đáp án ' + 'ABCD'[n] + ' chưa đóng đúng.' }; }
        let nd = g.nd.trim();
        if (/^\\True(?![a-zA-Z])/.test(nd)) { nd = nd.replace(/^\\True\s*/, ''); dung = n; soDung++; }
        if (nd === '') { return { loi: 'đáp án ' + 'ABCD'[n] + ' đang để trống.' }; }
        dapAn.push(nd); i = g.het;
    }
    if (soDung === 0) { return { loi: 'chưa đánh dấu đáp án đúng bằng \\True (ví dụ {\\True 5}).' }; }
    if (soDung > 1) { return { loi: 'có ' + soDung + ' đáp án \\True, chỉ được 1.' }; }
    return { cau: cau, dapAn: dapAn, dung: dung, loiGiai: loiGiai };
}
