        // =====================================================
        //  DỮ LIỆU: ĐỀ THI, KẾT QUẢ + TRANG QUẢN TRỊ
        // =====================================================
        const KHO_DE = 'skyedu-de-thi';
        const KHO_KQ = 'skyedu-ket-qua';
        const MAU_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let dangLamBai = false;      // đang làm bài thi?
        let dongHoLamBai = null;     // bộ đếm giờ làm bài
        let conLaiLamBai = 0;        // số giây còn lại

        function taoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

        // Hai đề mẫu để có sẵn dữ liệu khi mở lần đầu
        function deMau() {
            const bay = new Date().toISOString();
            return [
                {
                    id: 'de-tsa-1', ten: 'Đề thi thử TSA số 1', phong: 'tsa', phut: 20, hienThi: true, ngayTao: bay, nguoiTao: 'admin@skyedu.vn',
                    cauHoi: [
                        { cau: 'Giá trị của biểu thức 2 + 3 × 4 là bao nhiêu?', dapAn: ['20', '14', '24', '12'], dung: 1 },
                        { cau: 'Số tiếp theo của dãy 2, 4, 8, 16, ... là?', dapAn: ['24', '30', '32', '20'], dung: 2 },
                        { cau: 'Hình chữ nhật dài 8 cm, rộng 5 cm có chu vi là?', dapAn: ['13 cm', '26 cm', '40 cm', '30 cm'], dung: 1 },
                        { cau: 'Mọi con mèo đều là động vật, Tom là một con mèo. Kết luận nào đúng?', dapAn: ['Tom là động vật', 'Tom là con chó', 'Tom không phải động vật', 'Không kết luận được'], dung: 0 },
                        { cau: 'Phương trình 2x + 6 = 14 có nghiệm x bằng?', dapAn: ['3', '4', '5', '10'], dung: 1 }
                    ]
                },
                {
                    id: 'de-hsa-1', ten: 'Đề thi thử HSA số 1', phong: 'hsa', phut: 15, hienThi: true, ngayTao: bay, nguoiTao: 'admin@skyedu.vn',
                    cauHoi: [
                        { cau: 'Thủ đô của Việt Nam là thành phố nào?', dapAn: ['Huế', 'Đà Nẵng', 'Hà Nội', 'Hải Phòng'], dung: 2 },
                        { cau: 'Nước nguyên chất sôi ở bao nhiêu độ C (áp suất tiêu chuẩn)?', dapAn: ['50', '80', '100', '120'], dung: 2 },
                        { cau: 'Căn bậc hai của 81 là?', dapAn: ['7', '8', '9', '10'], dung: 2 },
                        { cau: 'Từ trái nghĩa với "chăm chỉ" là?', dapAn: ['Siêng năng', 'Lười biếng', 'Cần cù', 'Nhanh nhẹn'], dung: 1 }
                    ]
                }
            ];
        }

        let deThi = docKho('localStorage', KHO_DE);
        if (!Array.isArray(deThi) || deThi.length === 0) { deThi = deMau(); ghiKho('localStorage', KHO_DE, deThi); }
        let ketQua = docKho('localStorage', KHO_KQ);
        if (!Array.isArray(ketQua)) { ketQua = []; }

        function luuTaiKhoan() { ghiKho('localStorage', KHO_TK, danhSach); }
        function luuDe() { ghiKho('localStorage', KHO_DE, deThi); }
        function luuKetQua() { ghiKho('localStorage', KHO_KQ, ketQua); }
        function ngayGio(iso) { return new Date(iso).toLocaleString('vi-VN'); }
        function soAdmin() { return danhSach.filter(function (u) { return u.vaiTro === 'admin'; }).length; }
        function timTaiKhoan(email) { return danhSach.find(function (u) { return u.email === email; }); }
        window.timTaiKhoan = timTaiKhoan;   // cho các phần mã khác dùng chung
        function giayThanhChu(s) { return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }

        // Số bài và điểm trung bình của một học sinh
        function thongKe(email) {
            const ds = ketQua.filter(function (k) { return k.email === email; });
            if (ds.length === 0) { return { so: 0, tb: null }; }
            const tong = ds.reduce(function (t, k) { return t + k.diem; }, 0);
            return { so: ds.length, tb: Math.round(tong / ds.length * 10) / 10 };
        }

        // ----- Hộp thoại: bản mới, có thể mở rộng và biết "đang làm bài" -----
        function moDialog(noiDung, rong) {
            document.querySelector('#dialog .modal-box').classList.toggle('wide', !!rong);
            document.querySelector('#dialog .modal-box').classList.remove('xl');
            dialogBody.innerHTML = noiDung;
            dialog.classList.add('open');
        }
        function dongDialog() {
            if (dangLamBai && !confirm('Thoát bây giờ sẽ không lưu bài làm. Bạn chắc chắn muốn thoát?')) { return; }
            dangLamBai = false;
            clearInterval(dongHoLamBai);
            dialog.classList.remove('open');
        }

        // ----- Chuyển tab trong trang quản trị -----
        document.querySelectorAll('.ad-tab').forEach(function (nut) {
            nut.addEventListener('click', function () {
                document.querySelectorAll('.ad-tab').forEach(function (n) { n.classList.remove('active'); });
                document.querySelectorAll('.ad-pane').forEach(function (p) { p.classList.remove('active'); });
                nut.classList.add('active');
                document.getElementById('ad-' + nut.dataset.ad).classList.add('active');
            });
        });

        function veQuanTri() { veCaThi(); veThongKe(); veHocSinh(); veDe(); veKetQua(); if (typeof veKho === 'function') { veKho(); } }

        // ===== Thống kê tổng quan =====
        function veThongKe() {
            const soHS = danhSach.filter(function (u) { return u.vaiTro === 'hocsinh'; }).length;
            let tb = '-';
            if (ketQua.length > 0) {
                tb = Math.round(ketQua.reduce(function (t, k) { return t + k.diem; }, 0) / ketQua.length * 10) / 10;
            }
            document.getElementById('ad-stats').innerHTML =
                '<div class="stat"><b>' + soHS + '</b><span>Học sinh</span></div>' +
                '<div class="stat"><b>' + deThi.length + '</b><span>Đề thi</span></div>' +
                '<div class="stat"><b>' + (typeof khoCH !== 'undefined' ? khoCH.length : 0) + '</b><span>Câu trong kho</span></div>' +
                '<div class="stat"><b>' + ketQua.length + '</b><span>Lượt làm bài</span></div>' +
                '<div class="stat"><b>' + tb + '</b><span>Điểm trung bình</span></div>';
        }

        // ===== QUẢN LÝ HỌC SINH / TÀI KHOẢN =====
        function veHocSinh() {
            const tuKhoa = document.getElementById('hs-tim').value.trim().toLowerCase();
            const chonVT = document.getElementById('hs-loc-vt').value;
            const chonLop = document.getElementById('hs-loc-lop');
            const lopCu = chonLop.value;

            // Tạo danh sách lớp từ dữ liệu
            const cacLop = [];
            danhSach.forEach(function (u) { if (u.lop && cacLop.indexOf(u.lop) === -1) { cacLop.push(u.lop); } });
            cacLop.sort();
            chonLop.innerHTML = '<option value="">Tất cả lớp</option>' + cacLop.map(function (l) {
                return '<option value="' + thoat(l) + '">' + thoat(l) + '</option>';
            }).join('');
            chonLop.value = cacLop.indexOf(lopCu) !== -1 ? lopCu : '';

            const ds = danhSach.filter(function (u) {
                if (chonVT && u.vaiTro !== chonVT) { return false; }
                if (chonLop.value && u.lop !== chonLop.value) { return false; }
                const chuoi = (u.ten + ' ' + u.email + ' ' + (u.sdt || '')).toLowerCase();
                if (tuKhoa && chuoi.indexOf(tuKhoa) === -1) { return false; }
                return true;
            });

            const thanh = document.getElementById('hs-body');
            if (ds.length === 0) {
                thanh.innerHTML = '<tr><td colspan="9" class="empty-row">Không có tài khoản nào phù hợp.</td></tr>';
            } else {
                thanh.innerHTML = ds.map(function (u) {
                    const tk = thongKe(u.email);
                    const e = thoat(u.email);
                    return '<tr>' +
                        '<td><b>' + thoat(u.ten) + '</b></td>' +
                        '<td>' + e + '</td>' +
                        '<td>' + (u.lop ? thoat(u.lop) : '-') + '</td>' +
                        '<td>' + (u.sdt ? thoat(u.sdt) : '-') + '</td>' +
                        '<td>' + (u.vaiTro === 'admin' ? '<span class="tag tag-blue">Quản trị</span>' : '<span class="tag tag-gray">Học sinh</span>') + '</td>' +
                        '<td>' + tk.so + '</td>' +
                        '<td>' + (tk.tb === null ? '-' : tk.tb) + '</td>' +
                        '<td>' + (u.khoa ? '<span class="tag tag-red">Đã khóa</span>' : '<span class="tag tag-green">Hoạt động</span>') + '</td>' +
                        '<td class="acts">' +
                            '<button class="icon-btn" data-act="kq" data-email="' + e + '" title="Xem kết quả">📊</button>' +
                            '<button class="icon-btn" data-act="sua" data-email="' + e + '" title="Sửa">✏️</button>' +
                            '<button class="icon-btn" data-act="khoa" data-email="' + e + '" title="' + (u.khoa ? 'Mở khóa' : 'Khóa') + '">' + (u.khoa ? '🔓' : '🔒') + '</button>' +
                            '<button class="icon-btn" data-act="mk" data-email="' + e + '" title="Đặt lại mật khẩu">🔑</button>' +
                            '<button class="icon-btn" data-act="xoa" data-email="' + e + '" title="Xóa">🗑</button>' +
                        '</td></tr>';
                }).join('');
            }
            document.getElementById('hs-dem').textContent = 'Đang hiển thị ' + ds.length + ' / ' + danhSach.length + ' tài khoản';
        }

        document.getElementById('hs-tim').addEventListener('input', veHocSinh);
        document.getElementById('hs-loc-vt').addEventListener('change', veHocSinh);
        document.getElementById('hs-loc-lop').addEventListener('change', veHocSinh);
        document.getElementById('hs-them').addEventListener('click', function () { moFormHocSinh(null); });

        // Các nút trong bảng (dùng một bộ lắng nghe chung cho cả bảng)
        document.getElementById('hs-body').addEventListener('click', function (e) {
            const nut = e.target.closest('button[data-act]');
            if (!nut) { return; }
            const u = timTaiKhoan(nut.dataset.email);
            if (!u) { return; }
            const act = nut.dataset.act;
            const laToi = nguoiDung && nguoiDung.email === u.email;

            if (act === 'sua') {
                moFormHocSinh(u.email);
            } else if (act === 'kq') {
                document.getElementById('kq-tim').value = u.email;
                document.querySelector('.ad-tab[data-ad="kq"]').click();
                veKetQua();
            } else if (act === 'khoa') {
                if (laToi) { hienToast('Bạn không thể tự khóa tài khoản của mình.'); return; }
                if (!u.khoa && u.vaiTro === 'admin' && soAdmin() <= 1) { hienToast('Phải còn ít nhất một quản trị viên hoạt động.'); return; }
                u.khoa = !u.khoa;
                luuTaiKhoan(); veQuanTri();
                hienToast(u.khoa ? 'Đã khóa tài khoản ' + u.ten : 'Đã mở khóa tài khoản ' + u.ten);
            } else if (act === 'xoa') {
                if (laToi) { hienToast('Bạn không thể tự xóa tài khoản của mình.'); return; }
                if (u.vaiTro === 'admin' && soAdmin() <= 1) { hienToast('Phải còn ít nhất một tài khoản quản trị.'); return; }
                if (!confirm('Xóa tài khoản "' + u.ten + '"? Kết quả làm bài của tài khoản này cũng sẽ bị xóa.')) { return; }
                danhSach = danhSach.filter(function (x) { return x.email !== u.email; });
                ketQua = ketQua.filter(function (k) { return k.email !== u.email; });
                luuTaiKhoan(); luuKetQua(); veQuanTri();
                hienToast('Đã xóa tài khoản ' + u.ten);
            }
        });

        // Biểu mẫu thêm / sửa tài khoản
        function moFormHocSinh(email) {
            const u = email ? timTaiKhoan(email) : null;
            const sua = u !== null && u !== undefined;

            moDialog(
                '<h3>' + (sua ? 'Sửa tài khoản' : 'Thêm tài khoản') + '</h3>' +
                '<p class="modal-sub">' + (sua ? 'Để trống mật khẩu nếu không muốn đổi.' : 'Tạo tài khoản để học sinh đăng nhập.') + '</p>' +
                '<div class="form-2col">' +
                    '<div class="field full"><label for="f-ten">Họ và tên</label><input id="f-ten" placeholder="Nguyễn Văn A"></div>' +
                    '<div class="field full"><label for="f-email">Email (dùng để đăng nhập)</label><input id="f-email" placeholder="ten@email.com"></div>' +
                    '<div class="field"><label for="f-mk">Mật khẩu</label><input id="f-mk" type="text" placeholder="' + (sua ? 'Để trống nếu giữ nguyên' : 'Ít nhất 6 ký tự') + '"></div>' +
                    '<div class="field"><label for="f-vt">Vai trò</label><select id="f-vt"><option value="hocsinh">Học sinh</option><option value="admin">Quản trị</option></select></div>' +
                    '<div class="field"><label for="f-lop">Lớp</label><input id="f-lop" placeholder="Ví dụ: 12A1"></div>' +
                    '<div class="field"><label for="f-sdt">Số điện thoại</label><input id="f-sdt" placeholder="Không bắt buộc"></div>' +
                    '<div class="field full"><label for="f-gc">Ghi chú</label><textarea id="f-gc" rows="2" placeholder="Ví dụ: Mục tiêu 28 điểm khối A00"></textarea></div>' +
                '</div>' +
                '<div class="form-error" id="f-loi"></div>' +
                '<div class="dialog-actions"><button class="btn-sec" id="f-huy">Hủy</button><button class="btn-link" id="f-luu">Lưu</button></div>',
                true
            );

            // Điền giá trị bằng DOM (an toàn, không cần escape)
            if (sua) {
                document.getElementById('f-ten').value = u.ten;
                document.getElementById('f-email').value = u.email;
                document.getElementById('f-email').disabled = true;     // email là khóa nên không đổi
                document.getElementById('f-vt').value = u.vaiTro;
                document.getElementById('f-lop').value = u.lop || '';
                document.getElementById('f-sdt').value = u.sdt || '';
                document.getElementById('f-gc').value = u.ghiChu || '';
            }

            document.getElementById('f-huy').addEventListener('click', dongDialog);
            document.getElementById('f-luu').addEventListener('click', function () {
                const loi = document.getElementById('f-loi');
                const ten = document.getElementById('f-ten').value.trim();
                const mail = document.getElementById('f-email').value.trim().toLowerCase();
                const mk = document.getElementById('f-mk').value;
                const vt = document.getElementById('f-vt').value;

                if (ten === '') { baoLoi(loi, 'Vui lòng nhập họ và tên.'); return; }
                if (!sua) {
                    if (!MAU_EMAIL.test(mail)) { baoLoi(loi, 'Email chưa đúng định dạng.'); return; }
                    if (timTaiKhoan(mail)) { baoLoi(loi, 'Email này đã có tài khoản.'); return; }
                    if (mk.length < 6) { baoLoi(loi, 'Mật khẩu cần ít nhất 6 ký tự.'); return; }
                } else if (mk !== '' && mk.length < 6) {
                    baoLoi(loi, 'Mật khẩu mới cần ít nhất 6 ký tự.'); return;
                }
                if (sua && u.vaiTro === 'admin' && vt !== 'admin' && soAdmin() <= 1) {
                    baoLoi(loi, 'Phải còn ít nhất một tài khoản quản trị.'); return;
                }

                const lop = document.getElementById('f-lop').value.trim();
                const sdt = document.getElementById('f-sdt').value.trim();
                const gc = document.getElementById('f-gc').value.trim();

                if (sua) {
                    u.ten = ten; u.vaiTro = vt; u.lop = lop; u.sdt = sdt; u.ghiChu = gc;
                    if (mk !== '') { u.matKhau = mk; }
                    if (nguoiDung && nguoiDung.email === u.email) { nguoiDung.ten = ten; }
                } else {
                    danhSach.push({ ten: ten, email: mail, matKhau: mk, vaiTro: vt, lop: lop, sdt: sdt, ghiChu: gc,
                                    khoa: false, ngayTao: new Date().toISOString() });
                }
                luuTaiKhoan();
                dongDialog();
                capNhatGiaoDien();
                if (!laAdmin()) { showPage('home'); } else { veQuanTri(); }
                hienToast(sua ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản cho ' + ten + ' ✔');
            });
        }

        // ===== QUẢN LÝ ĐỀ THI =====
        function veDe() {
            const luoi = document.getElementById('de-luoi');
            if (deThi.length === 0) {
                luoi.innerHTML = '<div class="empty-row">Chưa có đề thi nào. Bấm "+ Tạo đề thi" để bắt đầu.</div>';
                return;
            }
            luoi.innerHTML = deThi.map(function (d) {
                const luot = ketQua.filter(function (k) { return k.deId === d.id; }).length;
                return '<div class="de-card">' +
                    '<div class="de-top">' +
                        '<span class="tag ' + (d.phong === 'tsa' ? 'tag-blue' : 'tag-green') + '">' + thoat(d.phong.toUpperCase()) + '</span>' +
                        (d.hienThi ? '<span class="tag tag-green">Đang mở</span>' : '<span class="tag tag-gray">Đang ẩn</span>') +
                    '</div>' +
                    '<h4>' + thoat(d.ten) + '</h4>' +
                    '<p class="de-info">📝 ' + d.cauHoi.length + ' câu · ⏱ ' + d.phut + ' phút · 👥 ' + luot + ' lượt làm</p>' +
                    '<div class="de-acts">' +
                        '<button class="icon-btn" data-act="sua" data-id="' + thoat(d.id) + '" title="Sửa">✏️ Sửa</button>' +
                        '<button class="icon-btn" data-act="an" data-id="' + thoat(d.id) + '" title="Ẩn / hiện">' + (d.hienThi ? '🙈 Ẩn' : '👁 Mở') + '</button>' +
                        '<button class="icon-btn" data-act="nhan" data-id="' + thoat(d.id) + '" title="Nhân bản">📄 Nhân bản</button>' +
                        '<button class="icon-btn" data-act="xoa" data-id="' + thoat(d.id) + '" title="Xóa">🗑</button>' +
                    '</div></div>';
            }).join('');
        }

        document.getElementById('de-them').addEventListener('click', function () { moFormDe(null); });
        document.getElementById('de-luoi').addEventListener('click', function (e) {
            const nut = e.target.closest('button[data-act]');
            if (!nut) { return; }
            const d = deThi.find(function (x) { return x.id === nut.dataset.id; });
            if (!d) { return; }
            const act = nut.dataset.act;
            if (act === 'sua') {
                moFormDe(d.id);
            } else if (act === 'an') {
                d.hienThi = !d.hienThi;
                luuDe(); veQuanTri();
                hienToast(d.hienThi ? 'Đề đã được mở cho học sinh.' : 'Đề đã được ẩn.');
            } else if (act === 'nhan') {
                const ban = JSON.parse(JSON.stringify(d));
                ban.id = taoId(); ban.ten = d.ten + ' (bản sao)'; ban.hienThi = false; ban.ngayTao = new Date().toISOString();
                deThi.push(ban);
                luuDe(); veQuanTri();
                hienToast('Đã nhân bản đề thi (đang ẩn).');
            } else if (act === 'xoa') {
                if (!confirm('Xóa đề "' + d.ten + '"? Kết quả đã nộp của đề này vẫn được giữ lại.')) { return; }
                deThi = deThi.filter(function (x) { return x.id !== d.id; });
                luuDe(); veQuanTri();
                hienToast('Đã xóa đề thi.');
            }
        });
