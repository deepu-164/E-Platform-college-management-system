export function getPagination(page: number, limit: number): { skip: number; take: number } {
  const take = Math.max(1, limit);
  const skip = Math.max(0, (page - 1) * take);
  return { skip, take };
}
