interface WithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (reason: any) => void;
}

declare interface PromiseConstructor {
  withResolvers<T>(): WithResolvers<T>;
}
