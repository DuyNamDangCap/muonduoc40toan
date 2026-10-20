
        // Đánh số lại các câu hỏi trong biểu mẫu
        function danhSoCau() {
            document.querySelectorAll('#q-list .q-no').forEach(function (b, i) { b.textContent = 'Câu ' + (i + 1); });
        }

        let demCau = 0;   // để mỗi câu có nhóm nút tròn riêng
        function themCauHoi(q) {
            demCau++;
            const nhom = 'dung-' + demCau;
            const the = document.createElement('div');
            the.className = 'q-item';
            the.dataset.ls = (q && q.loiGiai) ? q.loiGiai : '';
            if (q && loaiCau(q) !== 'tn') {          // Đúng/Sai, Điền khuyết, Kéo thả: soạn ở Kho câu hỏi, ở đây giữ nguyên
                the.dataset.raw = JSON.stringify(q);
                the.innerHTML = '<div class="q-head"><b class="q-no"></b><button type="button" class="icon-btn q-del" title="Xóa câu này">🗑</button></div>' +
                    '<div class="q-lock">' + nhanLoai(q) + ' ' + cauGon(q, { khongHinh: true }) +
                    '<br><small>Dạng câu này soạn trong tab “Kho câu hỏi”. Ở đây câu được giữ nguyên khi lưu đề (có thể xóa).</small></div>';
                the.querySelector('.q-del').addEventListener('click', function () { the.remove(); danhSoCau(); });
                document.getElementById('q-list').appendChild(the);
                danhSoCau();
                return;
            }
            the.innerHTML =
                '<div class="q-head"><b class="q-no"></b><button type="button" class="icon-btn q-del" title="Xóa câu này">🗑</button></div>' +
                '<textarea class="q-text" rows="2" placeholder="Nội dung câu hỏi"></textarea>' +
                ['A', 'B', 'C', 'D'].map(function (ch, i) {
                    return '<label class="q-opt"><input type="radio" name="' + nhom + '" value="' + i + '">' +
                           '<span class="q-ch">' + ch + '</span><input type="text" class="q-ans" placeholder="Đáp án ' + ch + '"></label>';
                }).join('') +
                '<div class="q-hint">Chọn nút tròn ở đáp án đúng</div>';

            if (q) {
                the.querySelector('.q-text').value = q.cau;
                const o = the.querySelectorAll('.q-ans');
                for (let i = 0; i < 4; i++) { o[i].value = q.dapAn[i] || ''; }
                the.querySelectorAll('input[type=radio]')[q.dung].checked = true;
            }
            the.querySelector('.q-del').addEventListener('click', function () { the.remove(); danhSoCau(); });
            document.getElementById('q-list').appendChild(the);
            danhSoCau();
        }

        // Biểu mẫu tạo / sửa đề thi
        function moFormDe(id) {
            const d = id ? deThi.find(function (x) { return x.id === id; }) : null;

            moDialog(
                '<h3>' + (d ? 'Sửa đề thi' : 'Tạo đề thi mới') + '</h3>' +
                '<div class="form-2col">' +
                    '<div class="field full"><label for="d-ten">Tên đề thi</label><input id="d-ten" placeholder="Ví dụ: Đề thi thử TSA số 2"></div>' +
                    '<div class="field"><label for="d-phong">Phòng luyện</label><select id="d-phong"><option value="tsa">Phòng TSA</option><option value="hsa">Phòng HSA</option></select></div>' +
                    '<div class="field"><label for="d-goi">Gói đề</label><select id="d-goi">' + goiOptions() + '</select></div>' +
                    '<div class="field"><label for="d-phut">Thời gian làm bài (phút)</label><input id="d-phut" type="number" min="1" max="300" value="30"></div>' +
                    '<label class="check full"><input type="checkbox" id="d-hien" checked> Cho học sinh làm đề này ngay</label>' +
                '</div>' +
                '<h4 class="q-title">Câu hỏi</h4>' +
                '<p class="modal-sub">Soạn nhanh câu trắc nghiệm tại đây. Câu <b>Đúng/Sai, Điền khuyết, Kéo thả</b>: soạn trong tab <b>Kho câu hỏi</b>, tick chọn rồi bấm “Tạo đề từ câu đã chọn”.</p>' +
                '<div id="q-list"></div>' +
                '<button type="button" class="btn-sec" id="q-them">+ Thêm câu hỏi</button>' +
                '<div class="form-error" id="d-loi"></div>' +
                '<div class="dialog-actions"><button class="btn-sec" id="de-huy">Hủy</button><button class="btn-link" id="de-luu">Lưu đề thi</button></div>',
                true
            );

            if (d) {
                document.getElementById('d-ten').value = d.ten;
                document.getElementById('d-phong').value = d.phong;
                document.getElementById('d-goi').value = d.goi || 'mien-phi';
                document.getElementById('d-phut').value = d.phut;
                document.getElementById('d-hien').checked = d.hienThi;
                d.cauHoi.forEach(function (q) { themCauHoi(q); });
            } else {
                themCauHoi(null);
            }

            document.getElementById('q-them').addEventListener('click', function () { themCauHoi(null); });
            document.getElementById('de-huy').addEventListener('click', dongDialog);
            document.getElementById('de-luu').addEventListener('click', function () {
                const loi = document.getElementById('d-loi');
                const ten = document.getElementById('d-ten').value.trim();
                const phut = parseInt(document.getElementById('d-phut').value, 10);
                const cacCau = document.querySelectorAll('#q-list .q-item');

                if (ten === '') { baoLoi(loi, 'Vui lòng nhập tên đề thi.'); return; }
                if (!(phut >= 1 && phut <= 300)) { baoLoi(loi, 'Thời gian làm bài phải từ 1 đến 300 phút.'); return; }
                if (cacCau.length === 0) { baoLoi(loi, 'Đề thi cần có ít nhất một câu hỏi.'); return; }

                const cauHoi = [];
                let hopLe = true;
                cacCau.forEach(function (it, i) {
                    if (!hopLe) { return; }
                    if (it.dataset.raw) { cauHoi.push(JSON.parse(it.dataset.raw)); return; }
                    const cau = it.querySelector('.q-text').value.trim();
                    const dapAn = Array.prototype.map.call(it.querySelectorAll('.q-ans'), function (o) { return o.value.trim(); });
                    const chon = it.querySelector('input[type=radio]:checked');
                    if (cau === '' || dapAn.some(function (a) { return a === ''; })) {
                        baoLoi(loi, 'Câu ' + (i + 1) + ': hãy nhập đủ nội dung và cả 4 đáp án.'); hopLe = false; return;
                    }
                    if (!chon) {
                        baoLoi(loi, 'Câu ' + (i + 1) + ': hãy chọn đáp án đúng.'); hopLe = false; return;
                    }
                    cauHoi.push({ cau: cau, dapAn: dapAn, dung: parseInt(chon.value, 10), loiGiai: it.dataset.ls || '' });
                });
                if (!hopLe) { return; }

                const phong = document.getElementById('d-phong').value;
                const hien = document.getElementById('d-hien').checked;
                if (d) {
                    d.ten = ten; d.phong = phong; d.goi = document.getElementById('d-goi').value; d.phut = phut; d.hienThi = hien; d.cauHoi = cauHoi;
                } else {
                    deThi.push({ id: taoId(), ten: ten, phong: phong, goi: document.getElementById('d-goi').value, phut: phut, hienThi: hien, cauHoi: cauHoi,
                                 ngayTao: new Date().toISOString(), nguoiTao: nguoiDung ? nguoiDung.email : '' });
                }
                luuDe();
                dongDialog();
                veQuanTri();
                hienToast(d ? 'Đã cập nhật đề thi.' : 'Đã tạo đề thi mới ✔');
            });
        }

        // ===== KẾT QUẢ LÀM BÀI =====
        function veKetQua() {
            const tuKhoa = document.getElementById('kq-tim').value.trim().toLowerCase();
            const ds = ketQua.filter(function (k) {
                return !tuKhoa || (k.ten + ' ' + k.email + ' ' + k.tenDe).toLowerCase().indexOf(tuKhoa) !== -1;
            }).sort(function (a, b) { return a.ngay < b.ngay ? 1 : -1; });

            const thanh = document.getElementById('kq-body');
            if (ds.length === 0) {
                thanh.innerHTML = '<tr><td colspan="7" class="empty-row">Chưa có kết quả nào.</td></tr>';
                return;
            }
            thanh.innerHTML = ds.map(function (k) {
                return '<tr>' +
                    '<td><b>' + thoat(k.ten) + '</b><br><small>' + thoat(k.email) + '</small></td>' +
                    '<td>' + thoat(k.tenDe) + '</td>' +
                    '<td><b>' + k.diem + '</b> / 10</td>' +
                    '<td>' + k.dung + ' / ' + k.tong + '</td>' +
                    '<td>' + giayThanhChu(k.giay) + '</td>' +
                    '<td>' + ngayGio(k.ngay) + '</td>' +
                    '<td><button class="icon-btn" data-id="' + thoat(k.id) + '" title="Xóa kết quả">🗑</button></td>' +
                '</tr>';
            }).join('');
        }
        document.getElementById('kq-tim').addEventListener('input', veKetQua);
        document.getElementById('kq-body').addEventListener('click', function (e) {
            const nut = e.target.closest('button[data-id]');
            if (!nut) { return; }
            if (!confirm('Xóa kết quả làm bài này?')) { return; }
            ketQua = ketQua.filter(function (k) { return k.id !== nut.dataset.id; });
            luuKetQua(); veQuanTri();
        });

        // ===== SAO LƯU / KHÔI PHỤC DỮ LIỆU =====
        function taiFile(ten, noiDung, loai) {
            const blob = new Blob([noiDung], { type: loai });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = ten;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        }

        document.getElementById('dl-xuat').addEventListener('click', function () {
            const goi = { phienBan: 1, xuatLuc: new Date().toISOString(), taiKhoan: danhSach, deThi: deThi, ketQua: ketQua, khoCauHoi: khoCH, dotThi: dotThi, caThi: caThi, dangKyCa: dangKyCa };
            taiFile('skyedu-du-lieu.json', JSON.stringify(goi, null, 2), 'application/json');
            hienToast('Đã tải file sao lưu.');
        });

        document.getElementById('dl-csv').addEventListener('click', function () {
            const dong = [['Họ tên', 'Email', 'Lớp', 'SĐT', 'Vai trò', 'Số bài làm', 'Điểm TB', 'Trạng thái', 'Ghi chú']];
            danhSach.forEach(function (u) {
                const tk = thongKe(u.email);
                dong.push([u.ten, u.email, u.lop || '', u.sdt || '', u.vaiTro === 'admin' ? 'Quản trị' : 'Học sinh',
                           tk.so, tk.tb === null ? '' : tk.tb, u.khoa ? 'Đã khóa' : 'Hoạt động', u.ghiChu || '']);
            });
            const csv = dong.map(function (r) {
                return r.map(function (o) { return '"' + String(o).replace(/"/g, '""') + '"'; }).join(',');
            }).join('\n');
            taiFile('skyedu-hoc-sinh.csv', '\uFEFF' + csv, 'text/csv');   // \uFEFF giúp Excel đọc đúng tiếng Việt
            hienToast('Đã tải danh sách học sinh.');
        });

        document.getElementById('dl-nhap').addEventListener('click', function () {
            document.getElementById('dl-file').click();
        });
        document.getElementById('dl-file').addEventListener('change', function () {
            const f = this.files[0];
            if (!f) { return; }
            const doc = new FileReader();
            doc.onload = function () {
                try {
                    const g = JSON.parse(doc.result);
                    if (!Array.isArray(g.taiKhoan) || !Array.isArray(g.deThi) || !Array.isArray(g.ketQua)) { throw new Error('sai dinh dang'); }
                    if (!confirm('Khôi phục sẽ THAY THẾ toàn bộ dữ liệu hiện tại. Tiếp tục?')) { return; }
                    danhSach = g.taiKhoan;
                    deThi = g.deThi.filter(function (d) { return d && Array.isArray(d.cauHoi) && typeof d.id === 'string'; });
                    ketQua = g.ketQua.filter(function (k) { return k && typeof k.email === 'string'; });
                    if (Array.isArray(g.dotThi)) {
                        dotThi = g.dotThi;
                        caThi = Array.isArray(g.caThi) ? g.caThi : [];
                        dangKyCa = Array.isArray(g.dangKyCa) ? g.dangKyCa : [];
                    }
                    khoCH = Array.isArray(g.khoCauHoi) ? g.khoCauHoi.filter(function (q) { return q && Array.isArray(q.dapAn) && typeof q.id === 'string'; }) : []; luuKho();
                    damBaoTaiKhoanMau(); luuDe(); luuKetQua(); luuCa();
                    if (nguoiDung && !timTaiKhoan(nguoiDung.email)) { dangXuat(); } else { capNhatGiaoDien(); veQuanTri(); }
                    hienToast('Đã khôi phục dữ liệu ✔');
                } catch (err) {
                    hienToast('File không đúng định dạng dữ liệu SKY EDU.');
                }
            };
            doc.readAsText(f);
            this.value = '';
        });

        document.getElementById('dl-reset').addEventListener('click', function () {
            if (!confirm('Xóa TOÀN BỘ tài khoản, đề thi và kết quả rồi quay về dữ liệu mẫu?')) { return; }
            xoaKho('localStorage', KHO_TK); xoaKho('localStorage', KHO_DE); xoaKho('localStorage', KHO_KQ); xoaKho('localStorage', KHO_CA); xoaKho('localStorage', KHO_KHO);
            xoaKho('localStorage', KHO_PHIEN); xoaKho('sessionStorage', KHO_PHIEN);
            location.reload();
        });

        // =====================================================
        //  PHÍA HỌC SINH: PHÒNG LUYỆN VÀ LÀM BÀI THI
        // =====================================================
        // Danh sách đề trong phòng TSA / HSA (ghi đè hàm cũ, lấy dữ liệu thật)
        function moPhong(loai) {
            document.getElementById('modal-title').textContent = loai === 'tsa' ? 'Phòng TSA' : 'Phòng HSA';
            modalNote.textContent = '';
            modalList.innerHTML = '';

            const ds = deThi.filter(function (d) { return d.phong === loai && d.hienThi; });
            if (ds.length === 0) {
                modalList.innerHTML = '<p class="empty-row">Phòng này chưa có đề nào đang mở.</p>';
            }
            ds.forEach(function (d) {
                let tot = null;
                ketQua.forEach(function (k) {
                    if (k.deId === d.id && nguoiDung && k.email === nguoiDung.email && (tot === null || k.diem > tot)) { tot = k.diem; }
                });
                const dong = document.createElement('div');
                dong.className = 'exam';
                dong.innerHTML = '<div><div class="exam-name"></div><div class="exam-info">⏱ ' + d.phut + ' phút · ' +
                                 d.cauHoi.length + ' câu' + (tot !== null ? ' · Điểm cao nhất: <b>' + tot + '</b>' : '') + '</div></div>' +
                                 '<button>Làm bài</button>';
                dong.querySelector('.exam-name').textContent = d.ten;
                dong.querySelector('button').addEventListener('click', function () { batDauLamBai(d.id); });
                modalList.appendChild(dong);
            });
            modal.classList.add('open');
        }

        function batDauLamBai(id) {
            const de = deThi.find(function (x) { return x.id === id; });
            if (!de) { return; }
            dongPhong();

            let noiDung = '<div class="exam-top"><div><h3>' + thoat(de.ten) + '</h3>' +
                          '<span class="exam-meta">' + de.cauHoi.length + ' câu · ' + de.phut + ' phút</span></div>' +
                          '<div class="timer" id="timer">' + giayThanhChu(de.phut * 60) + '</div></div><div id="exam-qs">';
            de.cauHoi.forEach(function (q, i) {
                noiDung += '<div class="eq">'; if (q.anh && anhViTri(q) === 'tren') { noiDung += anhCauHTML(q, i + 1); } noiDung += '<div class="eq-text"><b>Câu ' + (i + 1) + '.</b> ' + thoat(q.cau) + '</div>'; if (q.anh && anhViTri(q) === 'duoi') { noiDung += anhCauHTML(q, i + 1); }
                q.dapAn.forEach(function (a, j) {
                    noiDung += '<label class="opt"><input type="radio" name="cau-' + i + '" value="' + j + '"><span><b>' +
                               'ABCD'.charAt(j) + '.</b> ' + thoat(a) + '</span></label>';
                });
                noiDung += '</div>';
            });
            noiDung += '</div><div class="form-error" id="exam-loi"></div>' +
                       '<div class="dialog-actions"><button class="btn-sec" id="exam-thoat">Thoát</button>' +
                       '<button class="btn-link" id="exam-nop">Nộp bài</button></div>';

            moDialog(noiDung, true);
            dangLamBai = true;
            conLaiLamBai = de.phut * 60;

            clearInterval(dongHoLamBai);
            dongHoLamBai = setInterval(function () {
                conLaiLamBai--;
                const o = document.getElementById('timer');
                if (o) {
                    o.textContent = giayThanhChu(Math.max(0, conLaiLamBai));
                    o.classList.toggle('gap', conLaiLamBai <= 60);
                }
                if (conLaiLamBai <= 0) { nopBai(de, true); }
            }, 1000);

            document.getElementById('exam-thoat').addEventListener('click', function () { dongDialog(); });
            document.getElementById('exam-nop').addEventListener('click', function () { nopBai(de, false); });
        }

        function nopBai(de, hetGio) {
            const cacCau = document.querySelectorAll('#exam-qs .eq');
            const chon = [];
            let chuaLam = 0;
            cacCau.forEach(function (c) {
                const r = c.querySelector('input[type=radio]:checked');
                if (r) { chon.push(parseInt(r.value, 10)); } else { chon.push(-1); chuaLam++; }
            });
            if (!hetGio && chuaLam > 0 && !confirm('Bạn còn ' + chuaLam + ' câu chưa làm. Vẫn nộp bài?')) { return; }

            clearInterval(dongHoLamBai);
            dangLamBai = false;

            let dung = 0;
            de.cauHoi.forEach(function (q, i) { if (chon[i] === q.dung) { dung++; } });
            const tong = de.cauHoi.length;
            const diem = tinhDiemIRT(de, chon);                       // chấm theo IRT
            const giay = Math.max(0, de.phut * 60 - conLaiLamBai);

            ketQua.push({ id: taoId(), email: nguoiDung.email, ten: nguoiDung.ten, deId: de.id, tenDe: de.ten,
                          diem: diem, dung: dung, tong: tong, giay: giay, ngay: new Date().toISOString(), ans: chon.slice() });
            luuKetQua();

            let xem = '';
            de.cauHoi.forEach(function (q, i) {
                if (chon[i] !== q.dung) {
                    xem += '<div class="rv"><div><b>Câu ' + (i + 1) + '.</b> ' + thoat(q.cau) + '</div>' +
                           '<div class="rv-sai">Bạn chọn: ' + (chon[i] === -1 ? '(bỏ trống)' : thoat(q.dapAn[chon[i]])) + '</div>' +
                           '<div class="rv-dung">Đáp án đúng: ' + thoat(q.dapAn[q.dung]) + '</div></div>';
                }
            });
            xem = xem === '' ? '<p class="rv-full">🎉 Bạn trả lời đúng tất cả các câu!</p>' : '<h4>Các câu cần xem lại</h4>' + xem;

            let loiNhan = 'Cố gắng hơn ở lần sau nhé!';
            if (diem >= 8) { loiNhan = 'Xuất sắc! 🎉'; } else if (diem >= 5) { loiNhan = 'Khá tốt, tiếp tục luyện tập nhé!'; }

            moDialog(
                '<h3>Kết quả: ' + thoat(de.ten) + '</h3>' +
                '<div class="score-box"><div class="big">' + diem + ' / 10</div>' +
                '<div>Đúng ' + dung + ' / ' + tong + ' câu · ' + giayThanhChu(giay) + '</div><div>' + loiNhan + '</div></div>' +
                xem +
                '<div class="dialog-actions"><button class="btn-sec" id="kq-dong">Đóng</button>' +
                '<button class="btn-link" id="kq-lai">Làm lại</button></div>',
                true
            );
            document.getElementById('kq-dong').addEventListener('click', dongDialog);
            document.getElementById('kq-lai').addEventListener('click', function () { batDauLamBai(de.id); });
            if (laAdmin()) { veQuanTri(); }
        }
