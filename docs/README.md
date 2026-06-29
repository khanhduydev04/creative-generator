# Static Ads Generator — Documentation

Tài liệu bàn giao dự án. Đọc theo thứ tự sau:

## Mục lục

| # | Tài liệu | Nội dung | Dành cho |
|---|----------|----------|----------|
| 01 | [OVERVIEW](./01-OVERVIEW.md) | Tổng quan dự án, tech stack, cấu trúc thư mục | Tất cả |
| 02 | [GETTING STARTED](./02-GETTING-STARTED.md) | Cài đặt, cấu hình, chạy dự án | Developer mới |
| 03 | [DATABASE SCHEMA](./03-DATABASE-SCHEMA.md) | Sơ đồ database, chi tiết bảng, migration | Backend dev |
| 04 | [API REFERENCE](./04-API-REFERENCE.md) | 27 API endpoints, request/response format | Backend dev |
| 05 | [GENERATION PIPELINE](./05-GENERATION-PIPELINE.md) | Luồng tạo quảng cáo (core logic) | Backend dev |
| 06 | [SERVICES LAYER](./06-SERVICES-LAYER.md) | Tầng service, pattern CRUD, AI wrappers | Backend dev |
| 07 | [FRONTEND COMPONENTS](./07-FRONTEND-COMPONENTS.md) | UI components, layout, pages | Frontend dev |
| 08 | [TESTING](./08-TESTING.md) | Test framework, cách viết test, coverage | Developer |
| 09 | [ENVIRONMENT VARIABLES](./09-ENVIRONMENT-VARIABLES.md) | Danh sách env vars, bảo mật, cách lấy keys | DevOps / Developer |
| 10 | [DEPLOYMENT](./10-DEPLOYMENT.md) | Deploy Vercel/Docker, Edge Functions, monitoring | DevOps |

## Đọc nhanh (onboarding 30 phút)

1. **01-OVERVIEW** → hiểu dự án làm gì
2. **02-GETTING STARTED** → clone, cài đặt, chạy được local
3. **05-GENERATION PIPELINE** → hiểu core feature (tạo quảng cáo)
4. **04-API REFERENCE** → tra cứu khi cần

## Cần sửa / phát triển tiếp?

- Thêm API mới → xem pattern ở **04-API-REFERENCE** + **06-SERVICES-LAYER**
- Thêm component → xem rules ở **07-FRONTEND-COMPONENTS**
- Viết test → xem hướng dẫn ở **08-TESTING**
- Deploy → xem **10-DEPLOYMENT**

## Hướng dẫn sử dụng

| File | Mô tả | Dành cho |
|------|-------|----------|
| [STEP-BY-STEP GUIDE](./STEP_BY_STEP_GUIDE.md) | Hướng dẫn từng bước với screenshots | Tất cả users |
| [USER GUIDE](./USER_GUIDE.md) | Reference guide đầy đủ | Tất cả users |
| [APP WORKFLOW](./APP_WORKFLOW.md) | Luồng sử dụng (technical view) | Developer |

> **Screenshots:** Chụp screenshots thực tế và lưu vào `docs/screenshots/`. File STEP_BY_STEP_GUIDE.md có placeholder cho từng screenshot.

## Tài liệu khác trong repo

| File | Mô tả |
|------|-------|
| `CLAUDE.md` | Rules cho Claude Code AI assistant |
| `SECURITY_AUDIT_REPORT.md` | Báo cáo security audit (findings + fixes) |
| `.env.local.template` | Template env vars (copy → .env.local) |
