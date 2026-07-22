import {
  formatProductPrice,
  toProductFilters,
  type ProductListQueryState,
} from './product-list.helpers';

describe('product list helpers', () => {
  it('builds a filtered, paginated query for the current table state', () => {
    const state: ProductListQueryState = {
      search: ' granola ',
      categoryId: 4,
      onlineStatus: 'PUBLISHED',
      first: 20,
      rows: 10,
      sortField: 'salePrice',
      sortOrder: -1,
    };

    expect(toProductFilters(state)).toEqual({
      search: ' granola ',
      categoryId: 4,
      onlineStatus: 'PUBLISHED',
      page: 2,
      size: 10,
      sort: 'salePrice,desc',
    });
  });

  it('keeps price presentation localized', () => {
    expect(formatProductPrice(1250)).toContain('$');
  });
});
