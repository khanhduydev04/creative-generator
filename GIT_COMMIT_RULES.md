# Git Commit & Push Rules

> **Bắt buộc**: Mỗi lần được yêu cầu commit hoặc push, AI **phải đọc file này trước** để sinh commit message đúng chuẩn.

---

## 1. Quy tắc tổng quát

- Mỗi commit chỉ giải quyết **một mục đích duy nhất**
- Commit message phải viết bằng **tiếng Anh**
- Không commit file thừa: `node_modules/`, `.env`, `*.log`, `dist/`, `build/`
- Luôn chạy lint/test trước khi push (nếu có)
- Không dùng `git push --force` trừ khi được yêu cầu rõ ràng

---

## 2. Cấu trúc commit message

```
<type>(<scope>): <subject>

[body]         ← tuỳ chọn
[footer]       ← tuỳ chọn
```

### Ví dụ đầy đủ

```
feat(auth): add JWT refresh token support

Implement automatic token refresh before expiry.
Tokens are refreshed 60 seconds before they expire.

Closes #42
```

---

## 3. Các `type` hợp lệ

| Type       | Khi nào dùng |
|------------|--------------|
| `feat`     | Thêm tính năng mới |
| `fix`      | Sửa bug |
| `refactor` | Cải tổ code, không thêm tính năng, không sửa bug |
| `style`    | Thay đổi format, spacing, dấu chấm phẩy (không ảnh hưởng logic) |
| `docs`     | Cập nhật tài liệu, README, comment |
| `test`     | Thêm hoặc sửa test |
| `chore`    | Cấu hình build, CI/CD, dependencies, tooling |
| `perf`     | Cải thiện hiệu năng |
| `ci`       | Thay đổi file CI/CD pipeline |
| `revert`   | Hoàn tác một commit trước đó |

---

## 4. Quy tắc đặt `subject`

- Viết thường, không viết hoa chữ đầu
- Không kết thúc bằng dấu chấm `.`
- Tối đa **72 ký tự**
- Dùng **thì hiện tại** (imperative mood): `add`, `fix`, `update` *(không phải `added`, `fixed`)*

✅ Đúng:
```
fix(api): handle null response from payment gateway
feat(ui): add dark mode toggle to settings page
```

❌ Sai:
```
Fixed bug.
Added new feature for users
Update
```

---

## 5. Quy tắc `scope` (tuỳ chọn nhưng khuyến khích)

Scope là **module / khu vực** bị ảnh hưởng. Dùng tên ngắn gọn:

| Scope ví dụ | Ý nghĩa |
|-------------|---------|
| `auth`      | Xác thực / phân quyền |
| `api`       | Backend API |
| `ui`        | Giao diện người dùng |
| `db`        | Database / migration |
| `config`    | Cấu hình hệ thống |
| `deps`      | Dependencies |
| `ci`        | CI/CD pipeline |

---

## 6. Hướng dẫn AI tự sinh commit message

Khi được yêu cầu commit, AI phân tích `git diff --staged` hoặc danh sách file thay đổi, rồi:

### Bước 1 — Phân loại thay đổi

| Câu hỏi | Trả lời → type |
|--------|---------------|
| Có file mới / chức năng mới không? | `feat` |
| Có sửa lỗi / xử lý exception không? | `fix` |
| Chỉ đổi tên biến / tách hàm? | `refactor` |
| Chỉ đổi indent / format? | `style` |
| Chỉ chỉnh README / comment? | `docs` |
| Liên quan đến test? | `test` |
| Liên quan đến config / package? | `chore` |

### Bước 2 — Xác định scope

Nhìn vào thư mục / module chứa file thay đổi nhiều nhất → dùng làm scope.

### Bước 3 — Viết subject

Mô tả ngắn gọn **điều đã thay đổi và tác động**, không mô tả **cách làm**.

### Bước 4 — Thêm body nếu cần

Thêm body khi:
- Lý do thay đổi không rõ ràng từ subject
- Có breaking change
- Cần liên kết issue/ticket

---

## 7. Quy trình push chuẩn

```bash
# 1. Kiểm tra trạng thái
git status

# 2. Stage file cụ thể (không dùng git add . trừ khi chắc chắn)
git add <file1> <file2>

# 3. Commit với message đúng chuẩn
git commit -m "<type>(<scope>): <subject>"

# 4. Pull rebase trước khi push (tránh conflict)
git pull --rebase origin <branch>

# 5. Push
git push origin <branch>
```

---

## 8. Quy tắc đặt tên branch

```
<type>/<mô-tả-ngắn-kebab-case>
```

| Ví dụ branch | Ý nghĩa |
|-------------|---------|
| `feat/user-authentication` | Tính năng xác thực người dùng |
| `fix/login-null-pointer` | Sửa lỗi null pointer khi login |
| `refactor/payment-service` | Refactor payment service |
| `chore/upgrade-dependencies` | Nâng cấp dependencies |
| `docs/api-swagger` | Viết tài liệu Swagger |

---

## 9. Breaking Changes

Khi thay đổi làm hỏng tương thích ngược, thêm `!` sau type và ghi rõ trong footer:

```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: /auth/login now returns { token, user } instead of plain token string.
Clients must update their response parsing logic.
```

---

## 10. Checklist trước khi push

- [ ] Commit message đúng format `type(scope): subject`
- [ ] Subject ≤ 72 ký tự, viết thường, không dấu chấm cuối
- [ ] Không stage file thừa (`.env`, `node_modules`, build artifacts)
- [ ] Đã `git pull --rebase` từ branch gốc
- [ ] Không dùng `--force` trừ khi được yêu cầu
