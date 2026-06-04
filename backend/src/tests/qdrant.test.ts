import { tenantCollectionName } from '../config/qdrant';

describe('qdrant.tenantCollectionName', () => {
  test('uses tenant_{id} naming convention', () => {
    const id = '8b1d5c2e-1234-4abc-9def-abcdef012345';
    expect(tenantCollectionName(id)).toBe(`tenant_${id}`);
  });

  test('never produces a shared collection name', () => {
    const ids = ['a', 'b', 'c'];
    const names = ids.map(tenantCollectionName);
    expect(new Set(names).size).toBe(3);
    expect(names.every((n) => n.startsWith('tenant_'))).toBe(true);
  });
});
