type Success<T> = {
  ok: true;
  result: T;
};

type Failure<E extends Error = Error> = {
  ok: false;
  error: E;
};

type Result<T, E extends Error = Error> = Success<T> | Failure<E>;

const Result = {
  success<T>(value: T): Success<T> {
    return { ok: true, result: value };
  },

  failure<E extends Error>(error: E): Failure<E> {
    return { ok: false, error };
  },

  isSuccess<T, E extends Error>(result: Result<T, E>): result is Success<T> {
    return result.ok;
  },

  isFailure<T, E extends Error>(result: Result<T, E>): result is Failure<E> {
    return !result.ok;
  },
};

export { Result };
