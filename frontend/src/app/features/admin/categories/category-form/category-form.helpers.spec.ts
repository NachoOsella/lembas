import { buildCategoryRequest } from './category-form.helpers';

describe('category form helpers', () => {
  it('builds a normalized valid create command', () => {
    expect(buildCategoryRequest('  Cereales  ', null, '  Granos  ')).toEqual({
      name: 'Cereales',
      parentId: null,
      description: 'Granos',
    });
  });

  it('rejects a command without a category name', () => {
    expect(buildCategoryRequest('   ', 2, 'Descripcion')).toBeNull();
  });
});
