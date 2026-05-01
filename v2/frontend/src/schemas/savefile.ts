import { z } from 'zod';
import type { SaveFile, CategoryNode } from '../../../shared/types';

const RuleSchema = z.strictObject({
  id: z.string(),
  field: z.enum(['text', 'merchantCategory']),
  match: z.enum(['substring', 'regex', 'exact']),
  pattern: z.string(),
  category: z.tuple([z.string(), z.string()]),
});

const CategoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.strictObject({
    name: z.string(),
    children: z.array(CategoryNodeSchema),
  })
);

const CategoryTreeSchema = z.array(CategoryNodeSchema);

export const SaveFileSchema = z.strictObject({
  version: z.literal(3),
  categories: CategoryTreeSchema,
  rules: z.array(RuleSchema),
  settings: z.strictObject({
    theme: z.enum(['light', 'dark']),
    density: z.string(),
  }),
});

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
