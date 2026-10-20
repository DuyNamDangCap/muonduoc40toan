document.getElementById('kho-them').addEventListener('click', function () { moSoanKho(null); });

// ---------- Nhập hàng loạt từ file .tex / dán ----------
const KHO_FILE_MAU = [
    '% File mẫu kho câu hỏi SKY EDU (định dạng ex_test)',
    KHO_MAU,
    '\\begin{ex}',
    '  Phương trình $x^2-5x+6=0$ có hai nghiệm là',
    '  \\choice',
    '  {$1;6$}',
    '  {$-2;-3$}',
    '  {\\True $2;3$}',
    '  {$-1;-6$}',
    '  \\loigiai{ Ta có $(x-2)(x-3)=0$ nên $x=2$ hoặc $x=3$. }',
    '\\end{ex}',
    ''
].join('\n');

document.getElementById('kho-nhap').addEventListener('click', function () {
    moDialog(
        '<h3>Nhập câu hỏi từ file .tex</h3>' +
        '<p class="modal-sub">Chọn file <b>.tex</b> (UTF-8) hoặc dán mã. Mỗi câu nằm trong <code>\\begin{ex} … \\end{ex}</code> (trắc nghiệm <code>\\choice</code>, đúng/sai <code>\\choiceTF</code>, nhiều đáp án <code>\\choiceMulti</code>, điền khuyết <code>\\blank</code>/<code>\\shortans</code>, kéo thả <code>\\drop</code>); cũng đọc được định dạng "Câu 1. / A. B. C. D. / Đáp án: B".</p>' +
        '<div class="kh-meta">' +
            '<div class="field"><label for="n-mon">Môn</label><select id="n-mon">' + KHO_MON.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="n-cd">Chủ đề</label><input id="n-cd" placeholder="Áp dụng cho tất cả câu"></div>' +
            '<div class="field"><label for="n-muc">Mức độ</label><select id="n-muc">' + KHO_MUC.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="field"><label for="n-file">Chọn file (.tex, .txt)</label><input type="file" id="n-file" accept=".tex,.txt,text/plain"></div>' +
        '<div class="field"><label for="n-chu">Hoặc dán mã LaTeX vào đây</label><textarea id="n-chu" rows="9" class="mono" spellcheck="false"></textarea></div>' +
        '<div class="imp-links">Tải file mẫu: <a href="#" id="n-mau">mau-kho-cau-hoi.tex</a></div>' +
        '<div class="imp-result" id="n-kq"></div>' +
        '<div class="dialog-actions"><button class="btn-sec" id="n-huy">Hủy</button><button class="btn-link" id="n-luu">Thêm vào kho</button></div>',
        true
    );
    const oChu = document.getElementById('n-chu'), oKq = document.getElementById('n-kq');
    let kq = { ds: [], loi: [] };
    function capNhat() {
        kq = phanTichKho(oChu.value);
        if (oChu.value.trim() === '') { oKq.innerHTML = ''; return; }
        let h = kq.ds.length ? '<div class="imp-ok">✔ Nhận diện được <b>' + kq.ds.length + '</b> câu hợp lệ.</div>' : '';
        if (kq.loi.length) {
            h += '<div class="imp-err"><b>' + kq.loi.length + ' lỗi (các câu lỗi sẽ không được thêm):</b><ul>' +
                kq.loi.slice(0, 6).map(function (x) { return '<li>' + thoat(x) + '</li>'; }).join('') + (kq.loi.length > 6 ? '<li>…</li>' : '') + '</ul></div>';
        }
        if (!kq.ds.length && !kq.loi.length) { h = '<div class="imp-err">Chưa nhận diện được câu hỏi nào.</div>'; }
        oKq.innerHTML = h;
    }
    oChu.addEventListener('input', capNhat);
    document.getElementById('n-file').addEventListener('change', function () { docFileVaoO(this, oChu, capNhat); });
    document.getElementById('n-mau').addEventListener('click', function (e) { e.preventDefault(); taiFile('mau-kho-cau-hoi.tex', '\uFEFF' + KHO_FILE_MAU + '\n' + KHO_MAU_DS + '\n' + KHO_MAU_DIEN + '\n' + KHO_MAU_KEO, 'application/x-tex'); });
    document.getElementById('n-huy').addEventListener('click', dongDialog);
    document.getElementById('n-luu').addEventListener('click', function () {
        capNhat();
        if (!kq.ds.length) { hienToast('Không có câu hợp lệ nào để thêm.'); return; }
        const mon = document.getElementById('n-mon').value, cd = document.getElementById('n-cd').value.trim(), muc = document.getElementById('n-muc').value, bay = new Date().toISOString();
        kq.ds.forEach(function (x) { khoCH.push(Object.assign({ id: taoId(), mon: mon, chuDe: cd, mucDo: muc, ngayTao: bay }, truongCau(x))); });
        luuKho(); dongDialog(); veQuanTri();
        hienToast('Đã thêm ' + kq.ds.length + ' câu vào kho ✔' + (kq.loi.length ? ' (bỏ qua ' + kq.loi.length + ' câu lỗi)' : ''));
    });
});

// ---------- Đồng bộ đám mây tự động (Firebase Firestore) ----------
const KHO_FIREBASE = {
    apiKey: "AIzaSyBCl_5FHbsbShN_eWcsFtG29O8eXQNJWc0",
    authDomain: "skyyyyedu.firebaseapp.com",
    projectId: "skyyyyedu",
    storageBucket: "skyyyyedu.firebasestorage.app",
    messagingSenderId: "104577778934",
    appId: "1:104577778934:web:f9fb9da7fe96a2b9b518d7"
};
(function () {
    const el = document.getElementById('kho-cloud');
    function tt(t) { if (el) { el.textContent = t; } }
    if (!window.firebase || !firebase.firestore) { tt('☁ Chưa kết nối (đang dùng dữ liệu trên máy này)'); return; }
    let col;
    try {
        if (!firebase.apps.length) { firebase.initializeApp(KHO_FIREBASE); }
        col = firebase.firestore().collection('khoCauHoi');
    } catch (e) { tt('☁ Lỗi kết nối đám mây'); return; }

    const daDay = {};          // id -> chuỗi JSON đã có trên đám mây
    let sanSang = false, hen = null, dangDay = false, lai = false;

    function lamMoi() { try { veKho(); } catch (e) {} }
    function demTt() { tt('☁ Đã đồng bộ · ' + khoCH.length + ' câu'); }

    function day() {
        if (dangDay) { lai = true; return; }
        const ids = new Set(), ops = [];
        khoCH.forEach(function (q) {
            ids.add(q.id);
            const j = JSON.stringify(q);
            if (daDay[q.id] !== j) { ops.push({ id: q.id, j: j }); }
        });
        Object.keys(daDay).forEach(function (id) { if (!ids.has(id)) { ops.push({ id: id, xoa: true }); } });
        if (!ops.length) { demTt(); return; }
        dangDay = true; tt('☁ Đang đồng bộ…');
        const cum = [];
        for (let i = 0; i < ops.length; i += 200) { cum.push(ops.slice(i, i + 200)); }
        cum.reduce(function (p, nhom) {
            return p.then(function () {
                const bt = firebase.firestore().batch();
                nhom.forEach(function (o) {
                    const ref = col.doc(o.id);
                    if (o.xoa) { bt.delete(ref); } else { bt.set(ref, { json: o.j, capNhat: Date.now() }); }
                });
                return bt.commit().then(function () {
                    nhom.forEach(function (o) { if (o.xoa) { delete daDay[o.id]; } else { daDay[o.id] = o.j; } });
                });
            });
        }, Promise.resolve()).then(function () {
            dangDay = false; demTt();
            if (lai) { lai = false; day(); }
        }).catch(function (e) {
            dangDay = false; tt('☁ Đồng bộ lỗi, sẽ thử lại khi bạn lưu tiếp');
            if (window.console) { console.warn('Đồng bộ kho lỗi', e); }
        });
    }

    window.khoDongBoDay = function () {
        if (!sanSang) { return; }
        clearTimeout(hen); hen = setTimeout(day, 400);
    };

    col.onSnapshot(function (snap) {
        let doi = false;
        snap.docChanges().forEach(function (ch) {
            const id = ch.doc.id;
            if (ch.type === 'removed') {
                delete daDay[id];
                const k = khoCH.findIndex(function (q) { return q.id === id; });
                if (k >= 0) { khoCH.splice(k, 1); doi = true; }
                return;
            }
            const j = ch.doc.get('json');
            if (typeof j !== 'string') { return; }
            if (ch.doc.metadata.hasPendingWrites) { return; }   // bản do chính máy này vừa ghi
            if (daDay[id] === j) { return; }
            let q; try { q = JSON.parse(j); } catch (e) { return; }
            if (!q || typeof q.id !== 'string') { return; }
            daDay[id] = j;
            const k = khoCH.findIndex(function (x) { return x.id === id; });
            if (k >= 0) { if (JSON.stringify(khoCH[k]) !== j) { khoCH[k] = q; doi = true; } }
            else { khoCH.push(q); doi = true; }
        });
        if (doi) { ghiKho('localStorage', KHO_KHO, khoCH); lamMoi(); }
        if (!sanSang) { sanSang = true; day(); } else if (doi) { demTt(); }
    }, function (e) {
        tt('☁ Không kết nối được đám mây (kiểm tra mạng hoặc quy tắc Firestore)');
        if (window.console) { console.warn('Firestore lỗi', e); }
    });
})();

// ---------- Đồng bộ kho giữa nhiều máy (gộp theo id, không ghi đè/xóa câu đang có) ----------
document.getElementById('kho-dong-bo-xuat').addEventListener('click', function () {
    if (!khoCH.length) { hienToast('Kho đang trống, chưa có gì để xuất.'); return; }
    const ngay = new Date().toISOString().slice(0, 10);
    taiFile('skyedu-kho-' + ngay + '.json', JSON.stringify({ loai: 'skyedu-kho', xuatLuc: new Date().toISOString(), khoCauHoi: khoCH }, null, 1), 'application/json');
    hienToast('Đã xuất ' + khoCH.length + ' câu. Mở file này ở máy kia bằng "Gộp kho từ máy khác".');
});
document.getElementById('kho-dong-bo-nhap').addEventListener('click', function () { document.getElementById('kho-dong-bo-file').click(); });
document.getElementById('kho-dong-bo-file').addEventListener('change', function () {
    const f = this.files[0]; this.value = '';
    if (!f) { return; }
    const doc = new FileReader();
    doc.onload = function () {
        try {
            const g = JSON.parse(doc.result);
            const ds = Array.isArray(g) ? g : g.khoCauHoi;
            if (!Array.isArray(ds)) { throw new Error('sai dinh dang'); }
            const co = new Set(khoCH.map(function (q) { return q.id; }));
            let them = 0, trung = 0;
            ds.forEach(function (q) {
                if (!q || typeof q.id !== 'string' || !Array.isArray(q.dapAn)) { return; }
                if (co.has(q.id)) { trung++; return; }
                co.add(q.id); khoCH.push(q); them++;
            });
            luuKho(); veQuanTri();
            hienToast('Đã gộp thêm ' + them + ' câu mới (' + trung + ' câu đã có sẵn). ✔');
        } catch (err) {
            hienToast('File không đúng định dạng kho câu hỏi SKY EDU.');
        }
    };
    doc.readAsText(f);
});

// ---------- Xuất ra file .tex biên dịch được trong TeXstudio ----------
document.getElementById('kho-xuat').addEventListener('click', function () {
    let ds = khoCH.filter(function (q) { return khoTT.chon.has(q.id); });
    if (ds.length === 0) { ds = khoLoc(); }
    if (ds.length === 0) { hienToast('Kho đang trống, chưa có gì để xuất.'); return; }
    const dau = ['\\documentclass[a4paper,12pt]{article}', '\\usepackage[utf8]{inputenc}', '\\usepackage[T5]{fontenc}', '\\usepackage[vietnamese]{babel}',
                 '\\usepackage{amsmath,amssymb}', '\\usepackage[loigiai]{ex_test}',
                 '% Lệnh cho câu điền khuyết / kéo thả (dùng trên web, in ra thành chỗ trống)',
                 '\\providecommand{\\blank}[1]{\\underline{\\hspace{2.5cm}}}', '\\providecommand{\\drop}[1]{\\fbox{\\rule{0pt}{1.1em}\\hspace{2cm}}}',
                 '\\providecommand{\\decoy}[1]{}', '\\providecommand{\\shortans}[1]{\\par\\textbf{Đáp án:} #1}',
                 '\\begin{document}', ''].join('\n');
    const noi = ds.map(function (q) { return q.nguon || taoTex(q); }).join('\n\n');
    taiFile('kho-cau-hoi.tex', '\uFEFF' + dau + noi + '\n\n\\end{document}\n', 'application/x-tex');
    hienToast('Đã xuất ' + ds.length + ' câu ra file .tex');
});

// ---------- Tạo đề thi từ các câu đã chọn ----------
document.getElementById('kho-de').addEventListener('click', function () {
    const ds = khoCH.filter(function (q) { return khoTT.chon.has(q.id); });
    if (ds.length === 0) { hienToast('Hãy tick chọn ít nhất một câu trong bảng.'); return; }
    moDialog(
        '<h3>Tạo đề thi từ kho</h3><p class="modal-sub">Đề gồm <b>' + ds.length + '</b> câu đã chọn (sao chép sang đề, sửa kho sau này không đổi đề).</p>' +
        '<div class="form-2col">' +
            '<div class="field full"><label for="t-ten">Tên đề thi</label><input id="t-ten" placeholder="Ví dụ: Đề thi thử TSA số 2"></div>' +
            '<div class="field"><label for="t-phong">Phòng luyện</label><select id="t-phong"><option value="tsa">Phòng TSA</option><option value="hsa">Phòng HSA</option></select></div>' +
            '<div class="field"><label for="t-goi">Gói đề</label><select id="t-goi">' + goiOptions() + '</select></div>' +
            '<div class="field"><label for="t-phut">Thời gian (phút)</label><input id="t-phut" type="number" min="1" max="300" value="' + Math.max(5, ds.length * 2) + '"></div>' +
            '<label class="check full"><input type="checkbox" id="t-hien" checked> Cho học sinh làm đề này ngay</label>' +
        '</div><div class="form-error" id="t-loi"></div>' +
        '<div class="dialog-actions"><button class="btn-sec" id="t-huy">Hủy</button><button class="btn-link" id="t-luu">Tạo đề</button></div>', true);
    document.getElementById('t-huy').addEventListener('click', dongDialog);
    document.getElementById('t-luu').addEventListener('click', function () {
        const loi = document.getElementById('t-loi');
        const ten = document.getElementById('t-ten').value.trim(), phut = parseInt(document.getElementById('t-phut').value, 10);
        if (ten === '') { baoLoi(loi, 'Vui lòng nhập tên đề thi.'); return; }
        if (!(phut >= 1 && phut <= 300)) { baoLoi(loi, 'Thời gian làm bài phải từ 1 đến 300 phút.'); return; }
        deThi.push({ id: taoId(), ten: ten, phong: document.getElementById('t-phong').value, goi: document.getElementById('t-goi').value, phut: phut,
                     hienThi: document.getElementById('t-hien').checked,
                     cauHoi: ds.map(saoCau),
                     ngayTao: new Date().toISOString(), nguoiTao: nguoiDung ? nguoiDung.email : '' });
        luuDe(); khoTT.chon.clear(); dongDialog(); veQuanTri();
        hienToast('Đã tạo đề "' + ten + '" (' + ds.length + ' câu) ✔');
    });
});

veKho();
