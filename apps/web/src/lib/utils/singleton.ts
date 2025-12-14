/**
 * Singleton utility function
 *
 * Creates a lazy singleton - the instance is created on first access
 * and reused for all subsequent calls.
 *
 * @example
 * const getDatabase = singleton(() => new DatabaseConnection());
 * const db = getDatabase(); // Creates instance
 * const db2 = getDatabase(); // Returns same instance
 */
export function singleton<T>(creator: () => T): () => T {
  let instance: T;
  return () => {
    if (!instance) {
      instance = creator();
    }
    return instance;
  };
}
