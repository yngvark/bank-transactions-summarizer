import { z } from 'zod';
import type { SaveFile, CategoryNode } from '../../../shared/types';

const TextPatternRuleSchema = z.strictObject({
  id: z.string(),
  type: z.enum(['substring', 'regex']),
  pattern: z.string(),
  category: z.tuple([z.string(), z.string()]),
});

const CategoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.strictObject({
    name: z.string(),
    emoji: z.string().optional(),
    children: z.array(CategoryNodeSchema),
  })
);

const CategoryTreeSchema = z.array(CategoryNodeSchema);

export const SaveFileSchema = z.strictObject({
  version: z.literal(2),
  categories: CategoryTreeSchema,
  rules: z.strictObject({
    merchantCodeMappings: z.record(z.string(), z.tuple([z.string(), z.string()])),
    textPatternRules: z.array(TextPatternRuleSchema),
  }),
  settings: z.strictObject({
    theme: z.enum(['light', 'dark']),
    density: z.string(),
  }),
});

const V1CategoryNodeSchema = z.strictObject({
  emoji: z.string().optional(),
  subcategories: z.array(z.string()),
});

export const V1SaveFileSchema = z.strictObject({
  version: z.literal(1),
  categories: z.record(z.string(), V1CategoryNodeSchema),
  rules: z.strictObject({
    merchantCodeMappings: z.record(z.string(), z.tuple([z.string(), z.string()])),
    textPatternRules: z.array(TextPatternRuleSchema),
  }),
  settings: z.strictObject({
    theme: z.enum(['light', 'dark']),
    density: z.string(),
  }),
});

export type V1SaveFile = z.infer<typeof V1SaveFileSchema>;

export type ValidationResult =
  | { ok: true; data: SaveFile }
  | { ok: false; error: string };

export function validateSaveFile(input: unknown): ValidationResult {
  const result = SaveFileSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data as SaveFile };
  }
  const first = result.error.issues[0];
  const path = first.path.length === 0 ? '<root>' : first.path.join('.');
  return { ok: false, error: `${path}: ${first.message}` };
}
