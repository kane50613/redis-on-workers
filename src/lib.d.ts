declare interface PromiseConstructor {
  withResolvers<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason: any) => void;
  };
}
