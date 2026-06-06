const ORDER_TABLES = ['orders', 'pedidos'];

function isMissingRelation(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('relation') || message.includes('does not exist') || message.includes('schema cache');
}

export async function runOnOrderTables(operation) {
  let lastError = null;

  for (const table of ORDER_TABLES) {
    const result = await operation(table);

    if (!result.error) {
      return { ...result, table };
    }

    lastError = result.error;
    if (!isMissingRelation(result.error)) {
      break;
    }
  }

  return { data: null, error: lastError, table: null };
}
