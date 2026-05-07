// Tests for validation logic in AddExpenseScreen

function validateExpense(
  amount: string,
  category: string,
  owner: string,
  date: string,
): string | null {
  const parsed = parseFloat(amount.replace(/,/g, ''));
  if (!amount || isNaN(parsed) || parsed <= 0) return 'Enter a valid amount';
  if (!category) return 'Select a category';
  if (!owner) return 'Select who paid';
  if (!date) return 'Select a date';
  return null;
}

describe('validateExpense', () => {
  it('passes with valid data', () => {
    expect(validateExpense('100', 'Food', 'TH', '2025-05-01')).toBeNull();
  });

  it('rejects empty amount', () => {
    expect(validateExpense('', 'Food', 'TH', '2025-05-01')).toBe('Enter a valid amount');
  });

  it('rejects zero amount', () => {
    expect(validateExpense('0', 'Food', 'TH', '2025-05-01')).toBe('Enter a valid amount');
  });

  it('rejects negative amount', () => {
    expect(validateExpense('-10', 'Food', 'TH', '2025-05-01')).toBe('Enter a valid amount');
  });

  it('rejects non-numeric amount', () => {
    expect(validateExpense('abc', 'Food', 'TH', '2025-05-01')).toBe('Enter a valid amount');
  });

  it('accepts decimal amounts', () => {
    expect(validateExpense('19.99', 'Food', 'TH', '2025-05-01')).toBeNull();
  });

  it('accepts amount with comma separator', () => {
    expect(validateExpense('1,234.56', 'Food', 'TH', '2025-05-01')).toBeNull();
  });

  it('rejects missing category', () => {
    expect(validateExpense('100', '', 'TH', '2025-05-01')).toBe('Select a category');
  });

  it('rejects missing owner', () => {
    expect(validateExpense('100', 'Food', '', '2025-05-01')).toBe('Select who paid');
  });

  it('rejects missing date', () => {
    expect(validateExpense('100', 'Food', 'TH', '')).toBe('Select a date');
  });
});

// Tests for merchant autofill logic
function applyMerchantSelection(
  merchantName: string,
  currentDescription: string,
): { merchant: string; description: string } {
  return {
    merchant: merchantName,
    description: !currentDescription.trim() ? merchantName : currentDescription,
  };
}

describe('applyMerchantSelection', () => {
  it('autofills description when empty', () => {
    const result = applyMerchantSelection('Coles', '');
    expect(result.description).toBe('Coles');
    expect(result.merchant).toBe('Coles');
  });

  it('does not overwrite existing description', () => {
    const result = applyMerchantSelection('Coles', 'Weekly groceries');
    expect(result.description).toBe('Weekly groceries');
    expect(result.merchant).toBe('Coles');
  });

  it('treats whitespace-only description as empty', () => {
    const result = applyMerchantSelection('Woolworths', '   ');
    expect(result.description).toBe('Woolworths');
  });

  it('sets merchant name always', () => {
    const result = applyMerchantSelection('Aldi', 'Something');
    expect(result.merchant).toBe('Aldi');
  });
});
