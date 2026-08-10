export interface ApiCollectionResponse<T> {
  data?: T[];
  items?: T[];
  results?: T[];
  content?: T[];
}

export function unwrapCollection<T>(response: T[] | ApiCollectionResponse<T>): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.data ?? response.items ?? response.results ?? response.content ?? [];
}
