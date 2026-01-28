import { z } from "zod";
import { isDisposableEmail } from "./email";

// Common field validators
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be less than 255 characters")
  .refine(
    (email) => !isDisposableEmail(email),
    "Disposable email addresses are not allowed"
  );

export const uuidSchema = z
  .string()
  .uuid("Invalid ID format");

export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .refine(
    (url) => url.startsWith("https://"),
    "URL must use HTTPS"
  )
  .optional()
  .or(z.literal(""));

export const instagramHandleSchema = z
  .string()
  .max(30, "Instagram handle must be less than 30 characters")
  .regex(
    /^@?[a-zA-Z0-9._]*$/,
    "Invalid Instagram handle format"
  )
  .optional()
  .or(z.literal(""));

export const textFieldSchema = (maxLength: number) =>
  z
    .string()
    .max(maxLength, `Must be less than ${maxLength} characters`)
    .refine(
      (text) => !/<script|javascript:|on\w+=/i.test(text),
      "Invalid characters detected"
    );

export const commissionRateSchema = z
  .number()
  .min(0, "Commission rate must be at least 0")
  .max(1, "Commission rate must be at most 100%");

export const amountSchema = z
  .number()
  .positive("Amount must be positive");

// Affiliate application schema
export const affiliateApplicationSchema = z.object({
  firstName: textFieldSchema(100),
  lastName: textFieldSchema(100),
  email: emailSchema,
  instagram: instagramHandleSchema,
  youtube: urlSchema,
  website: urlSchema,
  bio: textFieldSchema(1000).optional(),
  hcaptchaToken: z.string().min(1, "CAPTCHA verification required"),
});

// Affiliate status update schema (admin)
export const affiliateStatusUpdateSchema = z.object({
  affiliateId: uuidSchema,
  status: z.enum(["pending", "approved", "rejected", "suspended"]),
  reason: textFieldSchema(500).optional(),
});

// Bulk affiliate status update schema
export const bulkAffiliateStatusSchema = z.object({
  affiliateIds: z.array(uuidSchema).min(1).max(100),
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: textFieldSchema(500).optional(),
});

// Affiliate update schema (admin)
export const affiliateUpdateSchema = z.object({
  affiliateId: uuidSchema,
  commissionRate: commissionRateSchema.optional(),
  tierId: uuidSchema.optional().nullable(),
  paypalEmail: emailSchema.optional(),
});

// Referral status update schema
export const referralStatusUpdateSchema = z.object({
  referralId: uuidSchema,
  status: z.enum(["pending", "approved", "paid", "refunded", "rejected"]),
  reason: textFieldSchema(500).optional(),
});

// Bulk referral status update schema
export const bulkReferralStatusSchema = z.object({
  referralIds: z.array(uuidSchema).min(1).max(100),
  status: z.enum(["approved", "rejected"]),
  reason: textFieldSchema(500).optional(),
});

// Payout creation schema
export const payoutCreateSchema = z.object({
  affiliateIds: z.array(uuidSchema).min(1).max(50).optional(),
  minAmount: amountSchema.optional(),
});

// Tier update schema
export const tierUpdateSchema = z.object({
  tierId: uuidSchema,
  name: textFieldSchema(100).optional(),
  minReferrals: z.number().int().min(0).optional(),
  commissionRate: commissionRateSchema.optional(),
});

// Marketing asset schema
export const assetCreateSchema = z.object({
  name: textFieldSchema(200),
  assetType: z.enum(["image", "video", "document", "link"]),
  fileUrl: urlSchema,
  minTier: z.number().int().min(0).optional(),
  description: textFieldSchema(1000).optional(),
});

export const assetUpdateSchema = z.object({
  assetId: uuidSchema,
  name: textFieldSchema(200).optional(),
  fileUrl: urlSchema.optional(),
  minTier: z.number().int().min(0).optional(),
  description: textFieldSchema(1000).optional(),
});

// Validate and parse input, returning typed result or error
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Create user-friendly error message
  const firstError = result.error.errors[0];
  const errorPath = firstError.path.join(".");
  const errorMessage = errorPath
    ? `${errorPath}: ${firstError.message}`
    : firstError.message;

  return {
    success: false,
    error: errorMessage,
    details: result.error,
  };
}

// Create validation error response
export function createValidationErrorResponse(error: string, details?: z.ZodError): Response {
  return new Response(
    JSON.stringify({
      error: "Validation error",
      message: error,
      details: details?.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
