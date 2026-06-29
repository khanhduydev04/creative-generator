# Adlance Phase 1+2 Snapshot

Snapshot chụp tại 2026-04-28 trước khi rollback DB về PATI baseline để dev tiếp `main` branch.

Chứa 9 migration đã chạy trên Supabase remote (theo thứ tự version):

| # | Version | Name |
|---|---------|------|
| 1 | 20260426144253 | `01_adlance_drop_alter_v3.sql` |
| 2 | 20260426144446 | `02_adlance_create_tables.sql` |
| 3 | 20260426144833 | `03_adlance_rls_policies_v2.sql` |
| 4 | 20260426144940 | `04_adlance_storage_rls.sql` |
| 5 | 20260426145019 | `05_adlance_trigger_handle_new_user.sql` |
| 6 | 20260426145059 | `06_adlance_seed_system_concepts.sql` |
| 7 | 20260426150131 | `07_adlance_phase1_fixup.sql` |
| 8 | 20260427150709 | `08_adlance_transfer_ownership.sql` |
| 9 | 20260427151057 | `09_adlance_phase2_member_security_fixup.sql` |

## Cách restore khi quay lại Adlance work

1. Rollback migration `99_rollback_to_pati_baseline.sql` (nằm trong `supabase/`) đã đưa schema về PATI baseline. Trước khi áp Adlance lại, đọc migration đó để hiểu trạng thái hiện tại.
2. Áp tuần tự 9 file `.sql` trong thư mục này theo đúng thứ tự đánh số. Có thể dùng Supabase CLI hoặc MCP `apply_migration`.
3. Sau khi áp xong, chạy lại Phase 1 fixup data nếu cần (set `is_platform_admin`, tạo workspace mặc định, transfer ownership).

## Notes

- Các migration được dump từ `supabase_migrations.schema_migrations.statements` — đã chạy thành công trên remote DB.
- Migration #1 (`drop_alter_v3`) là destructive: xóa `clients`, `activity_log`, `app_settings`, xóa cột `profiles.role/department/is_active/last_login_at`, xóa `brands.client_id`. Đảm bảo PATI data đã rollback xong + data Adlance rỗng trước khi áp.
- Migration #6 chỉ là guard check `concept_prompts` tồn tại; không thay đổi schema.
