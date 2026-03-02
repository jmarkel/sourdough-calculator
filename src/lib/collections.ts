type WithId = {
  id: string;
};

export function appendItem<T>(items: T[], item: T) {
  return [...items, item];
}

export function removeItemById<T extends WithId>(items: T[], id: string, minimumLength = 1) {
  return items.length <= minimumLength ? items : items.filter((item) => item.id !== id);
}

export function patchItemById<T extends WithId>(items: T[], id: string, patch: Partial<T>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
