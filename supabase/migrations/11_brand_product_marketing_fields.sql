-- 11_brand_product_marketing_fields.sql
-- Add marketing config fields used by Stage 4 script generation.
alter table public.brand_products
  add column if not exists attributes text,
  add column if not exists target_audience text,
  add column if not exists selling_points text;

comment on column public.brand_products.attributes is 'Đặc tính sản phẩm (vd: độ cay, nguyên liệu)';
comment on column public.brand_products.target_audience is 'Đối tượng khách hàng mục tiêu';
comment on column public.brand_products.selling_points is 'Điểm bán/USP (vd: freeship, giá tốt)';
