import type { CategoryRequest } from '@features/catalog/domain/category';

/** Builds a category command, returning null when the required name is invalid. */
export function buildCategoryRequest(
  name: string,
  parentId: number | null,
  description: string,
): CategoryRequest | null {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }

  return {
    name: normalizedName,
    parentId,
    description: description.trim() || undefined,
  };
}
