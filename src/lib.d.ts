interface WithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

declare interface PromiseConstructor {
  withResolvers<T>(): WithResolvers<T>;
}
