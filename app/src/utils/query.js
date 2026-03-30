function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 200);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getOrder(query, allowed = []) {
  const sortBy = query.sortBy && allowed.includes(query.sortBy) ? query.sortBy : null;
  const sortOrder = (query.sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return sortBy ? { [sortBy]: sortOrder } : undefined;
}

function buildWhere(query, searchColumns = [], exactMap = {}, Like) {
  const filters = {};
  for (const key of Object.keys(exactMap)) {
    if (query[key] !== undefined && query[key] !== '') {
      filters[exactMap[key]] = query[key];
    }
  }
  const q = (query.q || '').trim();
  if (!q || searchColumns.length === 0) return filters; // no OR, simple AND filters
  // OR over search columns, AND with exact filters
  return searchColumns.map((col) => ({ ...filters, [col]: Like(`%${q}%`) }));
}

module.exports = {
  getPagination,
  getOrder,
  buildWhere,
};
