

        // =====================================================
        //  CA THI TSA: ĐỢT THI, CA THI, ĐĂNG KÝ CỦA HỌC SINH
        // =====================================================
        const KHO_CA = 'skyedu-ca-thi';
        let dotThi = [];      // đợt thi
        let caThi = [];       // ca thi thuộc một đợt
        let dangKyCa = [];    // học sinh đã đăng ký ca nào

        function luuCa() { ghiKho('localStorage', KHO_CA, { dotThi: dotThi, caThi: caThi, dangKyCa: dangKyCa }); }

        (function napCaThi() {
            const da = docKho('localStorage', KHO_CA);
            if (da && Array.isArray(da.dotThi)) {
                dotThi = da.dotThi;
                caThi = Array.isArray(da.caThi) ? da.caThi : [];
                dangKyCa = Array.isArray(da.dangKyCa) ? da.dangKyCa : [];
                return;
            }
            // Dữ liệu mẫu lần đầu: một đợt còn mở đăng ký để bạn thử ngay
            dotThi = [{ id: 'dot-mau', ten: 'Đợt 1 năm 2027 (mẫu)', ma: 'TSA27-1', ngayThi: '2027-01-16', hanDangKy: '2026-12-15T23:59', moDK: true }];
            caThi = [
                { id: 'ca-mau-1', dotId: 'dot-mau', gio: '2027-01-16T07:00', phong: 'Phòng F-101 (mẫu)', soCho: 40 },
                { id: 'ca-mau-2', dotId: 'dot-mau', gio: '2027-01-16T13:30', phong: 'Phòng F-102 (mẫu)', soCho: 40 }
            ];
            dangKyCa = [];
            luuCa();
        })();

        function dotDangXem() {
            const hop = document.getElementById('ca-dot-xem');
            return dotThi.find(function (d) { return d.id === (hop ? hop.value : ''); }) || null;
        }
        function dotDangMo(dot) {
            return dot.moDK !== false && new Date(dot.hanDangKy).getTime() > Date.now();
        }
        function caCuaDot(dotId) {
            return caThi.filter(function (c) { return c.dotId === dotId; })
                        .sort(function (a, b) { return a.gio < b.gio ? -1 : 1; });
        }
        function soDaDangKyCa(caId) { return dangKyCa.filter(function (r) { return r.caId === caId; }).length; }
        function dangKyCuaHocSinh(dotId, email) {
            return dangKyCa.find(function (r) { return r.dotId === dotId && r.email === email; }) || null;
        }
        function gioNgan(iso) {
            return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        function ngayNgan(s) { return new Date(s + 'T00:00').toLocaleDateString('vi-VN'); }
        function maDot(ngayThi) {
            const nam = ngayThi.slice(2, 4);
            let n = dotThi.length + 1;
            while (dotThi.some(function (d) { return d.ma === 'TSA' + nam + '-' + n; })) { n++; }
            return 'TSA' + nam + '-' + n;
        }

        // ----- Học sinh: đăng ký ca thi -----

        // ----- Thông tin khai báo khi đăng ký ca thi -----
        const DS_TINH_THANH = ['Hà Nội','Huế','Đà Nẵng','Hải Phòng','Cần Thơ','Lai Châu','Điện Biên','Sơn La','Lạng Sơn','Quảng Ninh','Thanh Hóa','Nghệ An','Hà Tĩnh','Cao Bằng','Tuyên Quang','Lào Cai','Thái Nguyên','Phú Thọ','Bắc Ninh','Hưng Yên','Ninh Bình','Quảng Trị','Quảng Ngãi','Gia Lai','Khánh Hòa','Lâm Đồng','Đắk Lắk','Hồ Chí Minh','Đồng Nai','Tây Ninh','An Giang','Vĩnh Long','Đồng Tháp','Cà Mau'];
        function formThongTinDK() {
            const tk = nguoiDung ? timTaiKhoan(nguoiDung.email) : null;
            const v = function (x) { return thoat(x || ''); };
            let tuyChon = '<option value="">-- Chọn tỉnh / thành phố --</option>';
            DS_TINH_THANH.forEach(function (t) {
                tuyChon += '<option value="' + thoat(t) + '"' + (tk && tk.tinh === t ? ' selected' : '') + '>' + thoat(t) + '</option>';
            });
            return '<div class="dk-profile"><h4>Thông tin dự thi</h4>' +
                   '<div class="form-2col">' +
                   '<div class="field full"><label for="dk-ten">Họ và tên</label><input id="dk-ten" value="' + v(tk ? tk.ten : '') + '" placeholder="Nhập họ và tên"></div>' +
                   '<div class="field"><label for="dk-lop">Lớp</label><input id="dk-lop" value="' + v(tk ? tk.lop : '') + '" placeholder="Ví dụ: 12A1"></div>' +
                   '<div class="field"><label for="dk-tinh">Tỉnh / Thành phố</label><select id="dk-tinh">' + tuyChon + '</select></div>' +
                   '<div class="field full"><label for="dk-truong">Trường</label><input id="dk-truong" value="' + v(tk ? tk.truong : '') + '" placeholder="Tên trường THPT"></div>' +
                   '</div><div class="form-error" id="dk-loi"></div></div>';
        }
        function moDangKyCa() {
            if (typeof veKhaoThi === 'function') { veKhaoThi(); }   // làm mới thẻ Khảo thí cùng lúc
            let noi = '<h3>Đăng ký ca thi TSA</h3>' +
                      '<p class="modal-sub">Chọn một ca còn chỗ. Mỗi học sinh chỉ đăng ký một ca cho mỗi đợt.</p>' + formThongTinDK();
            if (dotThi.length === 0) { noi += '<p class="empty-row">Chưa có đợt thi nào.</p>'; }

            dotThi.forEach(function (dot) {
                const mo = dotDangMo(dot);
                const dk = nguoiDung ? dangKyCuaHocSinh(dot.id, nguoiDung.email) : null;
                noi += '<div style="margin-top:18px">' +
                       '<div class="exam-name">' + thoat(dot.ten) + ' ' +
                       (mo ? '<span class="tag tag-green">Đang mở</span>' : '<span class="tag tag-gray">Đã đóng</span>') + '</div>' +
                       '<div class="exam-info">📅 Ngày thi ' + ngayNgan(dot.ngayThi) + ' · Hạn đăng ký ' + gioNgan(dot.hanDangKy) + '</div>';

                if (dk) {
                    const ca = caThi.find(function (c) { return c.id === dk.caId; });
                    noi += '<div class="dk-ok">✔ Số báo danh: <b>' + thoat(dk.soBaoDanh) + '</b>' +
                           (ca ? '<br>⏰ ' + gioNgan(ca.gio) + ' · ' + thoat(ca.phong) : '') + '</div>';
                    if (mo) { noi += '<button class="btn-danger" style="margin-top:10px" data-huy="' + thoat(dk.id) + '">Hủy đăng ký</button>'; }
                } else {
                    caCuaDot(dot.id).forEach(function (ca) {
                        const con = ca.soCho - soDaDangKyCa(ca.id);
                        noi += '<div class="ca-row"><div><b>' + gioNgan(ca.gio) + '</b><br><small>' + thoat(ca.phong) + '</small></div>' +
                               '<div>' + (con > 0 ? '<span class="tag tag-blue">Còn ' + con + ' chỗ</span>' : '<span class="tag tag-red">Hết chỗ</span>') + '</div>' +
                               (mo && con > 0 ? '<button class="btn-link" data-dk="' + thoat(ca.id) + '">Đăng ký</button>' : '') + '</div>';
                    });
                }
                noi += '</div>';
            });

            noi += '<div class="dialog-actions"><button class="btn-sec" id="ca-dong">Đóng</button></div>';
            moDialog(noi, true);
            document.getElementById('ca-dong').addEventListener('click', dongDialog);
        }

        function dangKyCaThi(caId) {
            if (!nguoiDung) { showPage('login'); return; }
            const hoTen = document.getElementById('dk-ten') ? document.getElementById('dk-ten').value.trim() : '';
            const lop = document.getElementById('dk-lop') ? document.getElementById('dk-lop').value.trim() : '';
            const truong = document.getElementById('dk-truong') ? document.getElementById('dk-truong').value.trim() : '';
            const tinh = document.getElementById('dk-tinh') ? document.getElementById('dk-tinh').value : '';
            const baoLoiDK = function (noi) {
                const o = document.getElementById('dk-loi');
                if (o) { baoLoi(o, noi); }
                hienToast(noi);
            };
            if (hoTen === '' || lop === '' || truong === '' || tinh === '') {
                baoLoiDK('Vui lòng khai đủ họ tên, lớp, trường và tỉnh / thành phố.');
                return;
            }
            const tkDK = timTaiKhoan(nguoiDung.email);
            if (tkDK) {
                tkDK.ten = hoTen; tkDK.lop = lop; tkDK.truong = truong; tkDK.tinh = tinh;
                luuTaiKhoan();
                nguoiDung.ten = hoTen;
            }
            const ca = caThi.find(function (c) { return c.id === caId; });
            const dot = ca ? dotThi.find(function (d) { return d.id === ca.dotId; }) : null;
            if (!ca || !dot) { hienToast('Ca thi này không còn tồn tại.'); return; }
            if (!dotDangMo(dot)) { hienToast('Đợt thi này đã hết hạn đăng ký.'); return; }
            if (trangThaiCa(ca) !== 'sapbatdau') { hienToast('Ca thi này đã bắt đầu, không thể đăng ký.'); return; }
            if (dangKyCuaHocSinh(dot.id, nguoiDung.email)) { hienToast('Bạn đã đăng ký đợt này rồi.'); return; }
            if (soDaDangKyCa(ca.id) >= ca.soCho) { hienToast('Ca này đã đủ chỗ, hãy chọn ca khác.'); return; }

            const seq = dangKyCa.filter(function (r) { return r.dotId === dot.id; })
                                .reduce(function (m, r) { return Math.max(m, parseInt(r.soBaoDanh.split('-').pop(), 10) || 0); }, 0) + 1;
            const soBD = dot.ma + '-' + String(seq).padStart(4, '0');
            dangKyCa.push({ id: taoId(), email: nguoiDung.email, ten: hoTen, lop: lop, truong: truong, tinh: tinh, dotId: dot.id, caId: ca.id,
                            soBaoDanh: soBD, ngay: new Date().toISOString() });
            luuCa();
            veCaThi();
            hienToast('Đăng ký thành công! Số báo danh: ' + soBD);
            moDangKyCa();
        }

        function huyDangKyCa(id) {
            const r = dangKyCa.find(function (x) { return x.id === id; });
            if (!r || !nguoiDung || r.email !== nguoiDung.email) { return; }
            const dot = dotThi.find(function (d) { return d.id === r.dotId; });
            if (dot && !dotDangMo(dot)) { hienToast('Đã hết hạn đăng ký, không thể hủy.'); return; }
            if (!confirm('Hủy đăng ký số báo danh ' + r.soBaoDanh + '?')) { return; }
            dangKyCa = dangKyCa.filter(function (x) { return x.id !== id; });
            luuCa();
            veCaThi();
            hienToast('Đã hủy đăng ký.');
            moDangKyCa();
        }

        // Bấm nút Đăng ký / Hủy trong hộp thoại (một bộ lắng nghe dùng cho mọi lần mở)
        dialogBody.addEventListener('click', function (e) {
            const dk = e.target.closest('button[data-dk]');
            if (dk) { dangKyCaThi(dk.dataset.dk); return; }
            const huy = e.target.closest('button[data-huy]');
            if (huy) { huyDangKyCa(huy.dataset.huy); }
        });
        document.getElementById('ca-mo').addEventListener('click', moDangKyCa);

        // ----- Quản trị: đợt thi và ca thi -----
        function veCaThi() {
            const hopXem = document.getElementById('ca-dot-xem');
            const hopChon = document.getElementById('ca-chon-dot');
            const thongTin = document.getElementById('ca-thong-tin');
            const bang = document.getElementById('ca-dk-body');
            if (!hopXem || !thongTin) { return; }

            const cu = hopXem.value;
            const tuyChon = dotThi.map(function (d) { return '<option value="' + thoat(d.id) + '">' + thoat(d.ten) + '</option>'; }).join('')
                            || '<option value="">(chưa có đợt)</option>';
            hopXem.innerHTML = tuyChon;
            document.getElementById('ca-dot-list').innerHTML = dotThi.map(function (d) { return '<option value="' + thoat(d.ten) + '">'; }).join('');
            document.getElementById('ca-de').innerHTML = '<option value="">-- Chưa gắn đề --</option>' + deThi.map(function (d) {
                return '<option value="' + thoat(d.id) + '">' + thoat(d.ten) + ' (' + d.phut + ' phút)</option>';
            }).join('');
            if (dotThi.some(function (d) { return d.id === cu; })) { hopXem.value = cu; }

            const dot = dotDangXem();
            if (!dot) {
                thongTin.innerHTML = '<p class="empty-row">Chưa có đợt thi nào. Hãy tạo đợt thi ở bước 1.</p>';
                bang.innerHTML = '';
                return;
            }
            if (hopChon.value.trim() === '') { hopChon.value = dot.ten; }

            let h = '<div class="ca-head"><b>' + thoat(dot.ten) + '</b> · Mã ' + thoat(dot.ma) +
                    ' · Ngày thi ' + ngayNgan(dot.ngayThi) + ' · Hạn đăng ký ' + gioNgan(dot.hanDangKy) + ' · ' +
                    (dotDangMo(dot) ? '<span class="tag tag-green">Đang nhận đăng ký</span>' : '<span class="tag tag-gray">Đã đóng</span>') + '</div>';
            const ds = caCuaDot(dot.id);
            if (ds.length === 0) {
                h += '<p class="empty-row">Đợt này chưa có ca thi nào. Thêm ca ở bước 2.</p>';
            } else {
                h += '<div class="table-wrap"><table class="tbl"><thead><tr><th>Giờ thi</th><th>Phòng</th><th>Số chỗ</th><th>Đề thi</th><th>Đã đăng ký</th><th>Thao tác</th></tr></thead><tbody>';
                ds.forEach(function (ca) {
                    const n = soDaDangKyCa(ca.id);
                    h += '<tr><td>' + gioNgan(ca.gio) + '</td><td>' + thoat(ca.phong) + '</td><td>' + ca.soCho + '</td>' +
                         '<td>' + thoat((deCuaCa(ca) || { ten: '-' }).ten) + '</td><td>' + n + '</td>' +
                         '<td class="acts"><button class="icon-btn" data-ca-act="sua" data-ca-id="' + thoat(ca.id) + '" title="Đổi số chỗ">✏️ Số chỗ</button>' +
                         (n === 0 ? '<button class="icon-btn" data-ca-act="xoa" data-ca-id="' + thoat(ca.id) + '" title="Xóa ca">🗑</button>' : '') +
                         '</td></tr>';
                });
                h += '</tbody></table></div>';
            }
            thongTin.innerHTML = h;

            const dk = dangKyCa.filter(function (r) { return r.dotId === dot.id; })
                               .sort(function (a, b) { return a.soBaoDanh < b.soBaoDanh ? -1 : 1; });
            if (dk.length === 0) {
                bang.innerHTML = '<tr><td colspan="9" class="empty-row">Chưa có học sinh nào đăng ký đợt này.</td></tr>';
            } else {
                bang.innerHTML = dk.map(function (r) {
                    const ca = caThi.find(function (c) { return c.id === r.caId; });
                    return '<tr><td><b>' + thoat(r.soBaoDanh) + '</b></td><td>' + thoat(r.ten) + '</td><td>' + thoat(r.email) + '</td><td>' + thoat(r.lop || '-') + '</td><td>' + thoat(r.truong || '-') + '</td><td>' + thoat(r.tinh || '-') + '</td>' +
                           '<td>' + (ca ? gioNgan(ca.gio) + ' · ' + thoat(ca.phong) : '-') + '</td>' +
                           '<td>' + ngayGio(r.ngay) + '</td>' +
                           '<td><button class="icon-btn" data-dk-xoa="' + thoat(r.id) + '" title="Hủy đăng ký">🗑</button></td></tr>';
                }).join('');
            }
        }

        function maTaoDotMoi() {
            const ten = document.getElementById('ca-dot-ten').value.trim();
            const ngay = document.getElementById('ca-dot-ngay').value;
            const han = document.getElementById('ca-dot-han').value;
            const tu = document.getElementById('ca-dot-tu').value;
            const le = document.getElementById('ca-dot-le').value.trim();
            if (ten === '' || !ngay || !han) { hienToast('Nhập đủ tên đợt, ngày thi và hạn đăng ký.'); return; }
            if (tu && new Date(tu).getTime() >= new Date(han).getTime()) { hienToast('Ngày mở đăng ký phải trước hạn đăng ký.'); return; }
            if (new Date(han).getTime() >= new Date(ngay + 'T00:00').getTime()) { hienToast('Hạn đăng ký phải trước ngày thi.'); return; }
            const dot = { id: taoId(), ten: ten, ma: maDot(ngay), ngayThi: ngay, hanDangKy: han, moDK: true, dangKyTu: tu, lePhi: le || 'Miễn phí' };
            dotThi.push(dot);
            luuCa();
            veCaThi();
            document.getElementById('ca-dot-xem').value = dot.id;
            document.getElementById('ca-chon-dot').value = dot.ten;
            veCaThi();
            hienToast('Đã tạo đợt thi ✔');
        }
        document.getElementById('ca-dot-tao').addEventListener('click', maTaoDotMoi);

        document.getElementById('ca-tao').addEventListener('click', function () {
            let dot = dotThi.find(function (d) { return d.ten === document.getElementById('ca-chon-dot').value.trim(); }) || null;
            const tenDot = document.getElementById('ca-chon-dot').value.trim();
            if (!dot) {
                if (tenDot === '') { hienToast('Nhập tên đợt thi: chọn đợt có sẵn hoặc gõ tên đợt mới.'); return; }
                const ngay = document.getElementById('ca-dot-ngay').value;
                const han = document.getElementById('ca-dot-han').value;
                if (!ngay || !han) { hienToast('Đợt "' + tenDot + '" chưa có. Điền Ngày thi và Hạn đăng ký ở bước 1 để tạo đợt mới.'); return; }
                if (new Date(han).getTime() >= new Date(ngay + 'T00:00').getTime()) { hienToast('Hạn đăng ký phải trước ngày thi.'); return; }
                dot = { id: taoId(), ten: tenDot, ma: maDot(ngay), ngayThi: ngay, hanDangKy: han, moDK: true,
                        dangKyTu: document.getElementById('ca-dot-tu').value,
                        lePhi: document.getElementById('ca-dot-le').value.trim() || 'Miễn phí' };
                dotThi.push(dot);
                hienToast('Đã tạo đợt "' + tenDot + '" ✔');
            }
            const gio = document.getElementById('ca-gio').value;
            const phong = document.getElementById('ca-phong').value.trim();
            const cho = parseInt(document.getElementById('ca-cho').value, 10);
            if (!dot) { hienToast('Hãy tạo đợt thi trước.'); return; }
            if (!gio || phong === '') { hienToast('Nhập giờ thi và tên phòng.'); return; }
            if (!(cho >= 1 && cho <= 2000)) { hienToast('Số chỗ phải từ 1 đến 2000.'); return; }
            caThi.push({ id: taoId(), dotId: dot.id, gio: gio, phong: phong, soCho: cho, deId: document.getElementById('ca-de').value || '' , taoLuc: new Date().toISOString() });
            luuCa();
            veCaThi();
            hienToast('Đã thêm ca thi ✔');
        });

        document.getElementById('ca-dot-xem').addEventListener('change', veCaThi);

        document.getElementById('ca-dot-dong').addEventListener('click', function () {
            const dot = dotDangXem();
            if (!dot) { return; }
            dot.moDK = dot.moDK === false;          // đảo cờ đóng / mở thủ công
            luuCa();
            veCaThi();
            hienToast(dot.moDK ? 'Đã mở đăng ký cho đợt này.' : 'Đã đóng đăng ký cho đợt này.');
        });

        document.getElementById('ca-dot-xoa').addEventListener('click', function () {
            const dot = dotDangXem();
            if (!dot) { return; }
            if (dangKyCa.some(function (r) { return r.dotId === dot.id; })) { hienToast('Đợt này đã có học sinh đăng ký, không thể xóa.'); return; }
            if (!confirm('Xóa đợt "' + dot.ten + '" và toàn bộ ca thi của đợt này?')) { return; }
            dotThi = dotThi.filter(function (d) { return d.id !== dot.id; });
            caThi = caThi.filter(function (c) { return c.dotId !== dot.id; });
            luuCa();
            veCaThi();
            hienToast('Đã xóa đợt thi.');
        });
