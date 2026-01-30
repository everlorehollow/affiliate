-- Change shopify_discount_id from bigint to text
-- to store GraphQL GID strings (e.g., "gid://shopify/DiscountCodeNode/12345")
alter table affiliates alter column shopify_discount_id type text using shopify_discount_id::text;
