import { TestBed } from '@angular/core/testing';

import { PosCartStore } from './pos-cart.store';

/** Unit tests for {@link PosCartStore}. */
describe('PosCartStore', () => {
  let store: PosCartStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(PosCartStore);
  });

  it('starts empty', () => {
    expect(store.lines()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.itemCount()).toBe(0);
  });

  describe('addItem', () => {
    it('inserts a new line with quantity 1 when the product is new', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });

      const lines = store.lines();
      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({
        productId: 1,
        name: 'Aceite',
        unitPrice: 100,
        quantity: 1,
      });
    });

    it('increments the quantity when the product already exists', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });

      const lines = store.lines();
      expect(lines).toHaveLength(1);
      expect(lines[0].quantity).toBe(2);
    });

    it('keeps lines in insertion order', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.addItem({ productId: 2, name: 'Arroz', unitPrice: 50 });
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });

      expect(store.lines().map((l) => l.productId)).toEqual([1, 2]);
    });
  });

  describe('derived signals', () => {
    it('total sums unitPrice * quantity for every line', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.addItem({ productId: 2, name: 'Arroz', unitPrice: 50 });
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });

      expect(store.total()).toBe(100 * 2 + 50 * 1);
    });

    it('itemCount sums the quantities across all lines', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.addItem({ productId: 2, name: 'Arroz', unitPrice: 50 });
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });

      expect(store.itemCount()).toBe(3);
    });
  });

  describe('removeLine', () => {
    it('drops the line with the matching productId', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.addItem({ productId: 2, name: 'Arroz', unitPrice: 50 });

      store.removeLine(1);

      const lines = store.lines();
      expect(lines).toHaveLength(1);
      expect(lines[0].productId).toBe(2);
    });

    it('is a no-op when the productId is not present', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.removeLine(99);
      expect(store.lines()).toHaveLength(1);
    });
  });

  describe('setQuantity', () => {
    it('updates the quantity of an existing line', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.setQuantity(1, 5);
      expect(store.lines()[0].quantity).toBe(5);
    });

    it('removes the line when the new quantity is zero', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.setQuantity(1, 0);
      expect(store.lines()).toEqual([]);
    });

    it('removes the line when the new quantity is negative', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.setQuantity(1, -2);
      expect(store.lines()).toEqual([]);
    });

    it('is a no-op when the productId is not present', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.setQuantity(999, 5);
      expect(store.lines()).toHaveLength(1);
      expect(store.lines()[0].quantity).toBe(1);
    });

    it('rounds down fractional quantities to integers', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.setQuantity(1, 3.7);
      expect(store.lines()[0].quantity).toBe(3);
    });
  });

  describe('clear', () => {
    it('resets the cart to empty', () => {
      store.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
      store.addItem({ productId: 2, name: 'Arroz', unitPrice: 50 });
      store.clear();

      expect(store.lines()).toEqual([]);
      expect(store.total()).toBe(0);
      expect(store.itemCount()).toBe(0);
    });
  });
});
