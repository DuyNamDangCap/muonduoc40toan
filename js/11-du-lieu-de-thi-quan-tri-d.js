
        document.getElementById('ca-thong-tin').addEventListener('click', function (e) {
            const nut = e.target.closest('button[data-ca-act]');
            if (!nut) { return; }
            const ca = caThi.find(function (c) { return c.id === nut.dataset.caId; });
            if (!ca) { return; }
            const n = soDaDangKyCa(ca.id);
            if (nut.dataset.caAct === 'sua') {
                const v = parseInt(prompt('Số chỗ mới (không nhỏ hơn ' + n + '):', ca.soCho), 10);
                if (isNaN(v)) { return; }
                if (!(v >= Math.max(1, n) && v <= 2000)) { hienToast('Số chỗ không hợp lệ.'); return; }
                ca.soCho = v;
                luuCa(); veCaThi();
                hienToast('Đã cập nhật số chỗ.');
            } else if (nut.dataset.caAct === 'xoa') {
                if (n > 0) { hienToast('Ca này đã có học sinh đăng ký, không thể xóa.'); return; }
                if (!confirm('Xóa ca thi này?')) { return; }
                caThi = caThi.filter(function (c) { return c.id !== ca.id; });
                luuCa(); veCaThi();
                hienToast('Đã xóa ca thi.');
            }
        });

        document.getElementById('ca-dk-body').addEventListener('click', function (e) {
            const nut = e.target.closest('button[data-dk-xoa]');
            if (!nut) { return; }
            if (!confirm('Hủy đăng ký của học sinh này?')) { return; }
            dangKyCa = dangKyCa.filter(function (r) { return r.id !== nut.dataset.dkXoa; });
            luuCa(); veCaThi();
            hienToast('Đã hủy đăng ký.');
        });


        // =====================================================
        //  KHẢO THÍ: THẺ CA THI CHO HỌC SINH
        // =====================================================
        function deCuaCa(ca) { return ca.deId ? (deThi.find(function (d) { return d.id === ca.deId; }) || null) : null; }

        // sapbatdau: chưa đến giờ thi | dangthi: đang trong giờ thi | ketthuc: đã hết giờ
        // sapbatdau: chưa đến ngày thi | ngaythi: đã đến ngày thi, chưa đến giờ | dangthi: đang trong giờ thi | ketthuc: đã hết giờ
        function trangThaiCa(ca) {
            const bd = new Date(ca.gio).getTime();
            const de = deCuaCa(ca);
            const ketThuc = bd + ((de ? de.phut : 60) + 15) * 60000;
            const dau = new Date(ca.gio); dau.setHours(0, 0, 0, 0);
            if (Date.now() >= ketThuc) { return 'ketthuc'; }
            if (Date.now() >= bd) { return 'dangthi'; }
            if (Date.now() >= dau.getTime()) { return 'ngaythi'; }
            return 'sapbatdau';
        }

        function conLaiTxt(ms) {
            const s = Math.max(0, Math.floor(ms / 1000));
            const ng = Math.floor(s / 86400), g = Math.floor((s % 86400) / 3600), p = Math.floor((s % 3600) / 60);
            if (ng > 0) { return 'Còn ' + ng + ' ngày ' + g + ' giờ'; }
            if (g > 0) { return 'Còn ' + g + ' giờ ' + p + ' phút'; }
            return 'Còn ' + p + ' phút';
        }

        function veKhaoThi() {
            const luoi = document.getElementById('ex-grid');
            if (!luoi) { return; }
            // Ca mới tạo lên trước; ca cũ không có thời điểm tạo thì xếp sau, theo giờ thi
            const ds = caThi.slice().sort(function (a, b) {
                const ta = a.taoLuc || '', tb = b.taoLuc || '';
                if (ta !== tb) { return ta < tb ? 1 : -1; }
                return a.gio < b.gio ? -1 : 1;
            });
            if (ds.length === 0) { luoi.innerHTML = '<p class="empty-row">Chưa có ca thi nào. Admin tạo ca thi để hiện ở đây.</p>'; return; }

            luoi.innerHTML = ds.map(function (ca) {
                const dot = dotThi.find(function (d) { return d.id === ca.dotId; });
                if (!dot) { return ''; }
                if (anKetThuc && trangThaiCa(ca) === 'ketthuc') { return ''; }
                const de = deCuaCa(ca);
                const dk = nguoiDung ? dangKyCuaHocSinh(dot.id, nguoiDung.email) : null;
                const soCon = ca.soCho - soDaDangKyCa(ca.id);
                const tt = trangThaiCa(ca);
                let nut = '', ghiChu = '';

                if (dk && dk.caId === ca.id) {
                    if (tt === 'sapbatdau') {
                        nut = '<button class="btn-soon" disabled>Sắp bắt đầu</button>';
                        ghiChu = '<div class="ex-note">' + conLaiTxt(new Date(ca.gio).getTime() - Date.now()) + '</div>';
                    } else if (tt === 'ketthuc') {
                        nut = '<button class="btn-off" disabled>Đã kết thúc</button>';
                    } else {
                        nut = de ? '<button class="btn-now" data-vao="' + thoat(ca.id) + '">Vào làm bài</button>'
                                 : '<button class="btn-off" disabled>Chưa gắn đề</button>';
                    }
                } else if (dk) {
                    nut = '<button class="btn-off" disabled>Đã đăng ký ca khác</button>';
                } else if (tt !== 'sapbatdau') {
                    nut = '<button class="btn-off" disabled>Đã bắt đầu</button>';
                } else if (!dotDangMo(dot)) {
                    nut = '<button class="btn-off" disabled>Đã hết hạn</button>';
                } else if (soCon <= 0) {
                    nut = '<button class="btn-off" disabled>Hết chỗ</button>';
                } else {
                    nut = '<button class="btn-link" data-mo-dk="1">Đăng ký</button>';
                }

                const xemKq = de ? '<a href="#" class="link" data-kq="' + thoat(de.id) + '">Xem kết quả</a>' : '';
                const thoiGianDK = (dot.dangKyTu ? gioNgan(dot.dangKyTu) : 'Mở ngay') + ' - ' + gioNgan(dot.hanDangKy);

                return '<div class="ex-card">' +
                    '<div class="ex-head">' + thoat(dot.ten) + '</div>' +
                    '<div class="ex-body">' +
                        '<div class="ex-row"><span>Hình thức thi</span><b><span class="tag tag-red">Thi tại địa điểm thi</span></b></div>' +
                        '<div class="ex-row"><span>Thời gian đăng ký</span><b>' + thoat(thoiGianDK) + '</b></div>' +
                        '<div class="ex-row"><span>Lệ phí</span><b>' + thoat(dot.lePhi || 'Miễn phí') + '</b></div>' +
                        '<div class="ex-row"><span>Thời gian thi</span><b>' + gioNgan(ca.gio) + '</b></div>' +
                        '<div class="ex-row"><span>Phòng thi</span><b>' + thoat(ca.phong) + '</b></div>' +
                        '<div class="ex-row"><span>Đề thi</span><b>' + thoat(de ? de.ten + ' (' + de.phut + ' phút)' : 'Chưa gắn đề') + '</b></div>' +
                        '<div class="ex-row"><span>Chỗ còn lại</span><b>' + Math.max(0, soCon) + ' / ' + ca.soCho + '</b></div>' +
                    '</div>' +
                    '<div class="ex-foot"><div>' + xemKq + '</div><div style="text-align:right">' + nut + ghiChu + '</div></div>' +
                '</div>';
            }).join('');
        }

        function moKetQuaDe(deId) {
            const de = deThi.find(function (d) { return d.id === deId; });
            const ds = ketQua.filter(function (k) { return nguoiDung && k.email === nguoiDung.email && k.deId === deId; })
                             .sort(function (a, b) { return a.ngay < b.ngay ? 1 : -1; });
            let noi = '<h3>Kết quả: ' + thoat(de ? de.ten : '') + '</h3>';
            if (ds.length === 0) { noi += '<p class="empty-row">Bạn chưa làm đề này.</p>'; }
            ds.forEach(function (k) {
                noi += '<div class="ca-row"><div><b>' + k.diem + ' / 10</b><br><small>' + k.dung + ' / ' + k.tong + ' câu · ' +
                       giayThanhChu(k.giay) + '</small></div><div>' + ngayGio(k.ngay) + '</div></div>';
            });
            noi += '<div class="dialog-actions"><button class="btn-sec" id="kqd-dong">Đóng</button></div>';
            moDialog(noi, false);
            document.getElementById('kqd-dong').addEventListener('click', dongDialog);
        }

        document.getElementById('ex-grid').addEventListener('click', function (e) {
            const vao = e.target.closest('button[data-vao]');
            if (vao) {
                const ca = caThi.find(function (c) { return c.id === vao.dataset.vao; });
                const de = ca ? deCuaCa(ca) : null;
                if (!ca || !de) { return; }
                if (Date.now() < new Date(ca.gio).getTime()) {
                    hienToast('Chưa đến giờ thi. Ca bắt đầu lúc ' + gioNgan(ca.gio));
                    return;
                }
                batDauLamBai(de.id);
                return;
            }
            const dk = e.target.closest('button[data-mo-dk]');
            if (dk) { moDangKyCa(); return; }
            const kq = e.target.closest('a[data-kq]');
            if (kq) { e.preventDefault(); moKetQuaDe(kq.dataset.kq); }
        });

        // Tự cập nhật trạng thái mỗi 15 giây khi đang ở trang Khảo thí
        setInterval(function () {
            const c = document.querySelector('.container');
            if (c && c.classList.contains('exams-mode')) { veKhaoThi(); }
        }, 15000);

        // =====================================================
        //  KHỞI ĐỘNG
        // =====================================================
        // Phiên đăng nhập cũ phải còn tài khoản hợp lệ (chưa bị xóa hoặc khóa)
        if (nguoiDung) {
            const tk = timTaiKhoan(nguoiDung.email);
            if (!tk || tk.khoa) {
                nguoiDung = null;
                xoaKho('localStorage', KHO_PHIEN);
                xoaKho('sessionStorage', KHO_PHIEN);
            } else {
                nguoiDung.ten = tk.ten;
            }
        }
        capNhatGiaoDien();
        showPage(nguoiDung ? 'home' : 'login');
