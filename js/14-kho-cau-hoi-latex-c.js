
function taoTex(q) {                           // đối tượng câu hỏi -> mã LaTeX ex
    const lo = loaiCau(q), lg = q.loiGiai ? '\n  \\loigiai{\n    ' + q.loiGiai + '\n  }' : '';
    if (lo === 'ds') {
        return '\\begin{ex}\n  ' + q.cau + '\n  \\choiceTF\n' +
            q.menh.map(function (m) { return '  {' + (m.dung ? '\\True ' : '') + m.nd + '}'; }).join('\n') + lg + '\n\\end{ex}';
    }
    if (lo === 'nhieu') {
        return '\\begin{ex}\n  ' + q.cau + '\n  \\choiceMulti\n' +
            q.menh.map(function (m) { return '  {' + (m.dung ? '\\True ' : '') + m.nd + '}'; }).join('\n') + lg + '\n\\end{ex}';
    }
    if (lo === 'dien' || lo === 'keo') { return '\\begin{ex}\n  ' + q.cau + lg + '\n\\end{ex}'; }
    return '\\begin{ex}\n  ' + q.cau + '\n  \\choice\n' +
        q.dapAn.map(function (a, j) { return '  {' + (j === q.dung ? '\\True ' : '') + a + '}'; }).join('\n') +
        (q.loiGiai ? '\n  \\loigiai{\n    ' + q.loiGiai + '\n  }' : '') + '\n\\end{ex}';
}

// Đọc nhiều câu: ưu tiên mã \begin{ex}, nếu không thì dùng bộ đọc văn bản / bảng / JSON có sẵn
function phanTichKho(raw) {
    raw = String(raw).replace(/^\uFEFF/, '');
    const ds = [], loi = [];
    if (/\\begin\{ex\}/.test(raw)) {
        const re = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/g; let m, n = 0;
        while ((m = re.exec(raw)) !== null) {
            n++;
            const r = phanTichEx(m[1]);
            if (r.loi) { loi.push('Câu ' + n + ': ' + r.loi); }
            else { r.nguon = '\\begin{ex}' + m[1].replace(/\s+$/, '') + '\n\\end{ex}'; ds.push(r); }
        }
        if (n === 0) { loi.push('Có \\begin{ex} nhưng thiếu \\end{ex}.'); }
    } else if (/\\(?:choice|choiceTF|choiceMulti|shortans|drop|blank)(?![a-zA-Z])/.test(raw)) {
        const r = phanTichEx(raw);
        if (r.loi) { loi.push('Câu 1: ' + r.loi); } else { r.nguon = taoTex(r); ds.push(r); }
    } else if (raw.trim() !== '') {
        const r = phanTichDe(raw);
        r.cauHoi.forEach(function (q) { q.nguon = taoTex(q); ds.push(q); });
        r.loi.forEach(function (x) { loi.push(x); });
    }
    return { ds: ds, loi: loi };
}

// ---------- Khối hiển thị một câu hỏi ----------
function khoXemHTML(q) {
    const lo = loaiCau(q), nhan = nhanLoai(q);
    const ls = q.loiGiai ? '<div class="kh-ls"><b>Lời giải.</b> ' + tex(q.loiGiai) + '</div>' : '';
    if (lo === 'ds') {
        return '<div class="kh-q"><div class="kh-qt">' + nhan + tex(q.cau) + '</div>' +
            q.menh.map(function (m, j) {
                return '<div class="kh-op ' + (m.dung ? 'ok' : 'sai') + '"><b>' + 'abcdefgh'.charAt(j) + ')</b><span>' + tex(m.nd) + '</span>' +
                       '<b style="margin-left:auto;white-space:nowrap;color:' + (m.dung ? '#0f8a5f' : '#d93025') + '">' + (m.dung ? '✔ Đúng' : '✖ Sai') + '</b></div>';
            }).join('') + ls + '</div>';
    }
    if (lo === 'nhieu') {
        return '<div class="kh-q"><div class="kh-qt">' + nhan + tex(q.cau) + '</div>' +
            q.menh.map(function (m, j) {
                return '<div class="kh-op' + (m.dung ? ' ok' : '') + '"><b>' + 'ABCDEFGH'.charAt(j) + '.</b><span>' + tex(m.nd) + '</span>' +
                       (m.dung ? '<b style="margin-left:auto;white-space:nowrap;color:#0f8a5f">✔ Đáp án đúng</b>' : '') + '</div>';
            }).join('') + ls + '</div>';
    }
    if (lo === 'dien') {
        const r = cauHTML(q, function (n, a) { return '<span class="kh-ans">' + dapAnChap(a).map(function (x) { return tex(x); }).join(' / ') + '</span>'; }, null);
        return '<div class="kh-q"><div class="kh-qt">' + nhan + r.h + '</div>' + ls + '</div>';
    }
    if (lo === 'keo') {
        const r = cauHTML(q, null, function (n, a) { return '<span class="kh-ans dr">' + tex(a) + '</span>'; });
        return '<div class="kh-q"><div class="kh-qt">' + nhan + r.h + '</div>' +
            (r.t.nhieu.length ? '<div class="kh-lb">Ô nhiễu (học sinh thấy thêm các ô này nhưng không có chỗ đúng)</div><div class="kh-chips">' +
                r.t.nhieu.map(function (x) { return '<span class="x-chip dc">' + tex(x) + '</span>'; }).join('') + '</div>' : '') + ls + '</div>';
    }
    return '<div class="kh-q"><div class="kh-qt">' + tex(q.cau) + '</div>' +
        q.dapAn.map(function (a, j) {
            return '<div class="kh-op' + (j === q.dung ? ' ok' : '') + '"><b>' + 'ABCD'[j] + '.</b><span>' + tex(a) + '</span></div>';
        }).join('') + ls + '</div>';
}

// ---------- Danh sách trong trang quản trị ----------
const khoTT = { gioiHan: 50, chon: new Set() };

function khoLoc() {
    const tk = document.getElementById('kho-tim').value.trim().toLowerCase();
    const mon = document.getElementById('kho-mon').value, muc = document.getElementById('kho-muc').value, dang = document.getElementById('kho-loai').value;
    return khoCH.filter(function (q) {
        if (mon && q.mon !== mon) { return false; }
        if (muc && q.mucDo !== muc) { return false; }
        if (dang && loaiCau(q) !== dang) { return false; }
        return !tk || (q.cau + ' ' + (q.chuDe || '') + ' ' + q.dapAn.join(' ') + ' ' + (q.menh || []).map(function (m) { return m.nd; }).join(' ')).toLowerCase().indexOf(tk) !== -1;
    });
}

function veKho() {
    const sm = document.getElementById('kho-mon'), sc = document.getElementById('kho-muc');
    if (sm.options.length === 0) {
        sm.innerHTML = '<option value="">Tất cả môn</option>' + KHO_MON.map(function (m) { return '<option>' + m + '</option>'; }).join('');
        sc.innerHTML = '<option value="">Mọi mức độ</option>' + KHO_MUC.map(function (m) { return '<option>' + m + '</option>'; }).join('');
    }
    const sl = document.getElementById('kho-loai');
    if (sl.options.length === 0) {
        sl.innerHTML = '<option value="">Mọi dạng câu</option>' + Object.keys(LOAI_TEN).map(function (k) { return '<option value="' + k + '">' + LOAI_TEN[k] + '</option>'; }).join('');
    }
    const ds = khoLoc();
    const hien = ds.slice(0, khoTT.gioiHan);
    const body = document.getElementById('kho-body');
    if (hien.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="empty-row">' + (khoCH.length === 0 ? 'Kho còn trống. Bấm "+ Soạn câu hỏi" hoặc "Nhập .tex / dán" để thêm câu đầu tiên.' : 'Không có câu hỏi nào phù hợp.') + '</td></tr>';
    } else {
        body.innerHTML = hien.map(function (q, i) {
            const id = thoat(q.id);
            return '<tr><td><input type="checkbox" class="kh-sel" data-id="' + id + '"' + (khoTT.chon.has(q.id) ? ' checked' : '') + '></td>' +
                '<td>' + (i + 1) + '</td><td><div class="kh-cell">' + nhanLoai(q) + cauGon(q, { khongHinh: true }) + '</div></td>' +
                '<td>' + thoat(q.mon || '-') + '</td><td>' + thoat(q.chuDe || '-') + '</td>' +
                '<td><span class="tag tag-blue">' + thoat(q.mucDo || '-') + '</span></td>' +
                '<td class="acts">' +
                    '<button class="icon-btn" data-act="xem" data-id="' + id + '" title="Xem">👁</button>' +
                    '<button class="icon-btn" data-act="sua" data-id="' + id + '" title="Sửa mã LaTeX">✏️</button>' +
                    '<button class="icon-btn" data-act="nhan" data-id="' + id + '" title="Nhân bản">📄</button>' +
                    '<button class="icon-btn" data-act="xoa" data-id="' + id + '" title="Xóa">🗑</button></td></tr>';
        }).join('');
    }
    document.getElementById('kho-dem').textContent = 'Hiển thị ' + hien.length + ' / ' + ds.length + ' câu lọc được (kho có ' + khoCH.length + ' câu) · Đã chọn ' + khoTT.chon.size + ' câu';
    document.getElementById('kho-more').innerHTML = ds.length > hien.length ? '<button class="btn-sec" id="kho-xem-them">Xem thêm 50 câu</button>' : '';
    const nutThem = document.getElementById('kho-xem-them');
    if (nutThem) { nutThem.addEventListener('click', function () { khoTT.gioiHan += 50; veKho(); }); }
    document.getElementById('kho-all').checked = hien.length > 0 && hien.every(function (q) { return khoTT.chon.has(q.id); });
}

['kho-tim', 'kho-mon', 'kho-muc', 'kho-loai'].forEach(function (id) {
    document.getElementById(id).addEventListener(id === 'kho-tim' ? 'input' : 'change', function () { khoTT.gioiHan = 50; veKho(); });
});
document.getElementById('kho-all').addEventListener('change', function () {
    const bat = this.checked;
    khoLoc().forEach(function (q) { if (bat) { khoTT.chon.add(q.id); } else { khoTT.chon.delete(q.id); } });
    veKho();
});
document.getElementById('kho-body').addEventListener('change', function (e) {
    const o = e.target.closest('input[data-id]'); if (!o) { return; }
    if (o.checked) { khoTT.chon.add(o.dataset.id); } else { khoTT.chon.delete(o.dataset.id); }
    veKho();
});
document.getElementById('kho-body').addEventListener('click', function (e) {
    const nut = e.target.closest('button[data-act]'); if (!nut) { return; }
    const q = khoCH.find(function (x) { return x.id === nut.dataset.id; }); if (!q) { return; }
    const act = nut.dataset.act;
    if (act === 'xem') {
        moDialog('<h3>Xem câu hỏi</h3><p class="modal-sub">' + thoat(q.mon || '') + (q.chuDe ? ' · ' + thoat(q.chuDe) : '') + (q.mucDo ? ' · ' + thoat(q.mucDo) : '') + '</p>' +
            khoXemHTML(q) + '<div class="dialog-actions"><button class="btn-sec" id="kx-dong">Đóng</button><button class="btn-link" id="kx-sua">Sửa mã LaTeX</button></div>', true);
        document.getElementById('kx-dong').addEventListener('click', dongDialog);
        document.getElementById('kx-sua').addEventListener('click', function () { moSoanKho(q.id); });
    } else if (act === 'sua') {
        moSoanKho(q.id);
    } else if (act === 'nhan') {
        const ban = JSON.parse(JSON.stringify(q)); ban.id = taoId(); ban.ngayTao = new Date().toISOString();
        khoCH.push(ban); luuKho(); veQuanTri(); hienToast('Đã nhân bản câu hỏi.');
    } else if (act === 'xoa') {
        if (!confirm('Xóa câu hỏi này khỏi kho? (Các đề đã tạo từ câu này không bị ảnh hưởng)')) { return; }
        khoCH = khoCH.filter(function (x) { return x.id !== q.id; }); khoTT.chon.delete(q.id);
        luuKho(); veQuanTri(); hienToast('Đã xóa câu hỏi.');
    }
});

// ---------- Trình soạn LaTeX + xem trước ----------
const KHO_MAU = [
    '\\begin{ex}',
    '  Tính giá trị của biểu thức $A=\\dfrac{1}{2}+\\dfrac{1}{3}$.',
    '  \\choice',
    '  {$\\dfrac{2}{5}$}',
    '  {\\True $\\dfrac{5}{6}$}',
    '  {$\\dfrac{1}{6}$}',
    '  {$1$}',
    '  \\loigiai{',
    '    Ta có $A=\\dfrac{3}{6}+\\dfrac{2}{6}=\\dfrac{5}{6}$.',
    '  }',
    '\\end{ex}',
    ''
].join('\n');

const KHO_MAU_DS = [
    '\\begin{ex}',
    '  Cho phương trình $3\\cos x+1=0$. Các khẳng định sau là đúng hay sai?',
    '  \\choiceTF',
    '  {\\True Phương trình có $2$ nghiệm phân biệt trong khoảng $(0;2\\pi)$}',
    '  {Tổng các nghiệm trong khoảng $(0;2\\pi)$ bằng $\\pi$}',
    '  {\\True Phương trình tương đương $\\cos x=-\\dfrac{1}{3}$}',
    '  \\loigiai{',
    '    Ta có $\\cos x=-\\dfrac{1}{3}$ nên có hai nghiệm $x_1$, $x_2=2\\pi-x_1$ trong $(0;2\\pi)$, tổng hai nghiệm bằng $2\\pi$.',
    '  }',
    '\\end{ex}',
    ''
].join('\n');
const KHO_MAU_NHIEU = [
    '\\begin{ex}',
    '  Cho một vật thể được tạo ra bằng cách quay miền giới hạn bởi $y=e^{-x}$, $x=0$, $x=1$ và $y=0$ quanh trục $Ox$.',
    '  \\choiceMulti',
    '  {\\True Thể tích của vật thể được tính bằng $V=\\pi\\int\\limits_0^1 e^{-2x}\\,\\mathrm{d}x$.}',
    '  {\\True Thể tích của vật thể là $\\dfrac{\\pi\\left(e^2-1\\right)}{2e^2}$.}',
    '  {\\True Diện tích của miền phẳng ban đầu là $1-\\dfrac{1}{e}$.}',
    '  {Vật thể này có hình dạng giống một hình nón.}',
    '  \\loigiai{',
    '    $V=\\pi\\int\\limits_0^1 e^{-2x}\\,\\mathrm{d}x=\\pi\\cdot\\dfrac{1-e^{-2}}{2}=\\dfrac{\\pi\\left(e^2-1\\right)}{2e^2}$; diện tích miền phẳng là $\\int\\limits_0^1 e^{-x}\\,\\mathrm{d}x=1-\\dfrac{1}{e}$. Đường $y=e^{-x}$ không phải đường thẳng nên vật thể không phải hình nón.',
    '  }',
    '\\end{ex}',
    ''
].join('\n');
const KHO_MAU_DIEN = [
    '\\begin{ex}',
    '  Trong không gian $Oxyz$, cho phương trình $x^2+y^2+z^2-2x-2my-2z+m+4=0$ ($m$ là tham số). Số các số nguyên dương $m$ nhỏ hơn $10$ để phương trình đã cho là phương trình mặt cầu là \\blank{7}.',
    '  \\loigiai{',
    '    Điều kiện: $1+m^2+1-(m+4)>0\\Leftrightarrow m^2-m-2>0\\Leftrightarrow m>2$ hoặc $m<-1$. Vậy $m\\in\\{3;4;\\dots;9\\}$, có $7$ giá trị.',
    '  }',
    '\\end{ex}',
    ''
].join('\n');
const KHO_MAU_KEO = [
    '\\begin{ex}',
    '  Hàm số $y=\\log\\left(x^2+1\\right)$ có tập xác định là \\drop{$\\mathbb{R}$} và tập giá trị là \\drop{$[0;+\\infty)$}.',
    '  \\decoy{$(-\\infty;0)$}',
    '  \\decoy{$(1;-\\infty)$}',
    '  \\decoy{$(-\\infty;1)$}',
    '  \\loigiai{',
    '    Vì $x^2+1>0$ với mọi $x$ nên tập xác định là $\\mathbb{R}$; $x^2+1\\ge 1$ nên $\\log(x^2+1)\\ge 0$.',
    '  }',
    '\\end{ex}',
    ''
].join('\n');

// Nút chèn nhanh. Dấu | là vị trí con trỏ sau khi chèn.
const KHO_NUT = [
    ['Mẫu trắc nghiệm', KHO_MAU, 'tpl'], ['Mẫu Đúng/Sai', KHO_MAU_DS, 'tpl'], ['Mẫu Nhiều đáp án', KHO_MAU_NHIEU, 'tpl'], ['Mẫu Điền khuyết', KHO_MAU_DIEN, 'tpl'], ['Mẫu Kéo thả', KHO_MAU_KEO, 'tpl'],
    ['$ $', '$|$'], ['\\frac', '\\dfrac{|}{}'], ['\\sqrt', '\\sqrt{|}'], ['x^n', '^{|}'], ['x_n', '_{|}'],
    ['\\int', '\\int\\limits_{|}^{}'], ['\\sum', '\\sum\\limits_{i=1}^{|}'], ['\\lim', '\\lim\\limits_{x\\to |}'],
    ['\\heva', '\\heva{|}'], ['\\vec', '\\overrightarrow{|}'], ['\\True', '\\True '],
    ['TikZ', '\\begin{tikzpicture}\n  \\draw[->] (0,0) -- (4,0) node[right] {$x$};\n  \\draw[->] (0,0) -- (0,3) node[above] {$y$};\n  \\draw[thick, blue] (0,0) rectangle (2,1.5);\n  \\fill[red] (2,1.5) circle (0.06) node[above right] {$A$};\n  |\n\\end{tikzpicture}'],
    ['\\loigiai', '\\loigiai{\n  |\n}'], ['\\choice', '\\choice\n{|}\n{}\n{}\n{}'],
    ['\\choiceTF', '\\choiceTF\n{\\True |}\n{}\n{}\n{}'], ['\\choiceMulti', '\\choiceMulti\n{\\True |}\n{}\n{}\n{}'], ['\\blank', '\\blank{|}'], ['\\shortans', '\\shortans{|}'], ['\\drop', '\\drop{|}'], ['\\decoy', '\\decoy{|}']
];

function moSoanKho(id) {
    const q = id ? khoCH.find(function (x) { return x.id === id; }) : null;
    moDialog(
        '<h3>' + (q ? 'Sửa câu hỏi (mã LaTeX)' : 'Soạn câu hỏi bằng LaTeX') + '</h3>' +
        '<p class="modal-sub">Gõ mã như trong TeXstudio (định dạng <b>ex_test</b>), bên phải hiện kết quả ngay. Phím <b>Tab</b> thụt 2 dấu cách.<br>' +
        '<b>5 dạng câu:</b> <code>\\choice</code> trắc nghiệm · <code>\\choiceTF</code> đúng/sai (ý đúng thêm <code>\\True</code>) · <code>\\choiceMulti</code> nhiều đáp án (mỗi đáp án đúng thêm <code>\\True</code>, được chọn nhiều ô) · <code>\\blank{đáp án}</code> hoặc <code>\\shortans{đáp án}</code> điền khuyết (nhiều đáp án chấp nhận: <code>a || b</code>) · ' +
        '<code>\\drop{đáp án đúng}</code> + <code>\\decoy{ô nhiễu}</code> kéo thả. Đặt <code>\\blank</code>, <code>\\drop</code> ngoài cặp <code>$…$</code>.' +
        (q ? '' : ' Dán nhiều khối <code>\\begin{ex}…\\end{ex}</code> thì lưu được nhiều câu cùng lúc.') + '</p>' +
        '<div class="kh-meta">' +
            '<div class="field"><label for="k-mon">Môn</label><select id="k-mon">' + KHO_MON.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="k-cd">Chủ đề</label><input id="k-cd" placeholder="Ví dụ: Hàm số, Tích phân…"></div>' +
            '<div class="field"><label for="k-muc">Mức độ</label><select id="k-muc">' + KHO_MUC.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="kh-split">' +
            '<div class="kh-left"><div class="kh-lb">MÃ LaTeX</div><div class="kh-tools" id="k-tools"></div>' +
                '<textarea id="k-src" class="kh-src" spellcheck="false" autocomplete="off"></textarea><div class="kh-st" id="k-st"></div></div>' +
            '<div class="kh-right"><div class="kh-lb">XEM TRƯỚC</div><div class="kh-prev" id="k-prev"></div></div>' +
        '</div>' +
        '<div class="form-error" id="k-loi"></div>' +
        '<div class="dialog-actions"><button class="btn-sec" id="k-huy">Hủy</button><button class="btn-link" id="k-luu">Lưu vào kho</button></div>',
        true
    );
    document.querySelector('#dialog .modal-box').classList.add('xl');

    const o = document.getElementById('k-src'), st = document.getElementById('k-st'), pv = document.getElementById('k-prev');
    o.value = q ? (q.nguon || taoTex(q)) : KHO_MAU;
    if (q) { document.getElementById('k-mon').value = q.mon || 'Toán'; document.getElementById('k-cd').value = q.chuDe || ''; document.getElementById('k-muc').value = q.mucDo || KHO_MUC[0]; }

    let hen = null, kq = { ds: [], loi: [] };
    function capNhat() {
        kq = phanTichKho(o.value);
        let h = '';
        kq.ds.forEach(function (x, i) {
            h += (kq.ds.length > 1 ? '<div class="kh-lb">CÂU ' + (i + 1) + '</div>' : '') + khoXemHTML(x) + (i < kq.ds.length - 1 ? '<hr style="margin:16px 0;border:0;border-top:1px dashed #d9e2f3">' : '');
        });
        pv.innerHTML = h || '<p class="tbl-foot">Chưa có câu hỏi hợp lệ để xem trước.</p>';
        if (kq.loi.length > 0) { st.className = 'kh-st er'; st.innerHTML = '✖ ' + thoat(kq.loi[0]) + (kq.loi.length > 1 ? ' (và ' + (kq.loi.length - 1) + ' lỗi khác)' : ''); }
        else if (kq.ds.length > 0) { st.className = 'kh-st ok'; st.textContent = '✔ Hợp lệ: ' + kq.ds.length + ' câu.'; }
        else { st.className = 'kh-st'; st.textContent = ''; }
    }
    o.addEventListener('input', function () { clearTimeout(hen); hen = setTimeout(capNhat, 150); });
    o.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const a = o.selectionStart; o.setRangeText('  ', a, o.selectionEnd, 'end'); o.dispatchEvent(new Event('input'));
        }
    });

    const tools = document.getElementById('k-tools');
    KHO_NUT.forEach(function (n) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = n[0]; if (n[2]) { b.className = n[2]; }
        b.addEventListener('click', function () {
            let s = n[1];
            if (n[2] === 'tpl') {
                if (o.value.trim() !== '' && !confirm('Thay toàn bộ nội dung đang soạn bằng mẫu câu hỏi?')) { return; }
                o.value = s; capNhat(); o.focus(); return;
            }
            const vt = s.indexOf('|'); s = s.replace('|', '');
            const a = o.selectionStart, z = o.selectionEnd, chon = o.value.slice(a, z);
            if (chon && vt !== -1) { s = s.slice(0, vt) + chon + s.slice(vt); }
            o.setRangeText(s, a, z, 'end');
            const pos = a + (vt === -1 ? s.length : vt + chon.length);
            o.setSelectionRange(pos, pos); o.focus(); capNhat();
        });
        tools.appendChild(b);
    });
    capNhat();

    document.getElementById('k-huy').addEventListener('click', dongDialog);
    document.getElementById('k-luu').addEventListener('click', function () {
        const loi = document.getElementById('k-loi');
        capNhat();
        if (kq.loi.length > 0) { baoLoi(loi, 'Hãy sửa lỗi trước khi lưu: ' + kq.loi[0]); return; }
        if (kq.ds.length === 0) { baoLoi(loi, 'Chưa có câu hỏi hợp lệ nào để lưu.'); return; }
        const meta = { mon: document.getElementById('k-mon').value, chuDe: document.getElementById('k-cd').value.trim(), mucDo: document.getElementById('k-muc').value };
        if (q) {
            const x = kq.ds[0];
            ganCau(q, x);
            q.mon = meta.mon; q.chuDe = meta.chuDe; q.mucDo = meta.mucDo;
            hienToast(kq.ds.length > 1 ? 'Đã cập nhật câu hỏi (chỉ lấy câu đầu tiên).' : 'Đã cập nhật câu hỏi ✔');
        } else {
            const bay = new Date().toISOString();
            kq.ds.forEach(function (x) { khoCH.push(Object.assign({ id: taoId(), mon: meta.mon, chuDe: meta.chuDe, mucDo: meta.mucDo, ngayTao: bay }, truongCau(x))); });
            hienToast('Đã thêm ' + kq.ds.length + ' câu vào kho ✔');
        }
        luuKho(); dongDialog(); veQuanTri();
    });
}
