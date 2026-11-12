import type { State } from './model';
export interface Repository {
  read(): State;
  transaction<T>(operation: (state: State) => T): T;
  replace(state: State): void;
}
