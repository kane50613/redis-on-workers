// node runtime doesn't have Promise.withResolvers yet
if (!Promise.withResolvers) {
  Promise.withResolvers = <T>() => {
    const result = {} as WithResolvers<T>;

    result.promise = new Promise<T>((resolve, reject) => {
      result.resolve = resolve;
      result.reject = reject;
    });

    return result;
  };
}
