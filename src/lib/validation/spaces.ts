import { z } from "zod";

const fieldSetting = z
  .object({
    enabled: z.boolean(),
    required: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled && value.required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A disabled field cannot be required",
        path: ["required"],
      });
    }
  });

export const fieldConfigSchema = z
  .object({
    name: fieldSetting,
    email: fieldSetting,
    company_name: fieldSetting,
    social_links: fieldSetting,
    profile_photo: fieldSetting,
  })
  .superRefine((config, ctx) => {
    if (!config.name.enabled || !config.name.required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name must be enabled and required",
        path: ["name"],
      });
    }
    if (!config.email.enabled || !config.email.required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email must be enabled and required",
        path: ["email"],
      });
    }
  });

export const defaultFieldConfig: z.infer<typeof fieldConfigSchema> = {
  name: { enabled: true, required: true },
  email: { enabled: true, required: true },
  company_name: { enabled: false, required: false },
  social_links: { enabled: false, required: false },
  profile_photo: { enabled: false, required: false },
};

export const createSpaceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters"),
  subtitle: z
    .string()
    .trim()
    .max(180, "Subtitle cannot exceed 180 characters")
    .optional()
    .or(z.literal("")),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(500, "Prompt cannot exceed 500 characters"),
  collectRating: z.boolean().default(true),
  theme: z.enum(["light", "warm", "dark"]).default("light"),
  fieldConfig: fieldConfigSchema,
});

export const updateSpaceSchema = createSpaceSchema.extend({
  id: z.string().uuid("Invalid space ID"),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type FieldConfig = z.infer<typeof fieldConfigSchema>;
