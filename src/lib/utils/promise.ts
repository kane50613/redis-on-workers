export interface WithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export function promiseWithResolvers<T>() {
  if ("withResolvers" in Promise && typeof Promise.withResolvers === "function")
    return Promise.withResolvers() as WithResolvers<T>;

  const result = {} as WithResolvers<T>;

  result.promise = new Promise<T>((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });

  return result;
}
