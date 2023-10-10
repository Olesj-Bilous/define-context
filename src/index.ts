import { Context, Reducer, createContext, useContext, useReducer } from "react";

/**
 * Creates a `React.Context` with `defaultValue` set to `null`,
 * and a hook into the context that throws a descriptive error
 * if `value` passed to `Context.Provider` is `null | undefined`.
 */
export default function defineContext<C>(
  descriptor: string,
  valueDescriptor?: string
): [
    Context: Context<null | C>,
    useContext: () => NonNullable<C>
  ] {
  const Context = createContext<null | C>(null)
  const useDefinedContext = () => {
    const value = useContext(Context)
    if (!value)
      throw new Error(`No${valueDescriptor ? ` ${valueDescriptor}` : ''} value was provided to ${descriptor}Context`)
    return value
  }
  return [
    Context,
    useDefinedContext
  ]
}

/**
 * A generic interface for keys passed to reducers.
 */
export interface ReducerKey<A, P> {
  action: A
  args: P
}

/**
 * Extract action from reducer key
 */
export type ReducerAction<K> = K extends ReducerKey<infer A, any> ? A : never

/**
 * Extract args from reducer key
 */
export type ReducerArgs<K> = K extends ReducerKey<any, infer P> ? P : never

/**
 * Initialises `React.useReducer` with a reducer before using it. 
 * Wraps `dispatch: React.Dispatch` with a `dispatcher`
 * that chains an action to dispatch of appropriate parameters.
 */
export function defineReducer<T, K extends ReducerKey<any, any>>(reducer: Reducer<T, K>) {
  return function useDefinedReducer(initState: T) {
    const [state, dispatch] = useReducer(reducer, initState)
    function dispatcher<A extends ReducerAction<K>>(action: A) {
      return function dispatchAction(args: ReducerArgs<K>) {
        dispatch({
          action,
          args
        } as K)
      }
    }
    return [state, dispatcher] as [state: T, dispatcher: typeof dispatcher]
  }
}
export function defineReducible<T, M, K extends keyof M>(reducer: Reducer<T, ReducerKey<K, M[K]>>) {
  return function useDefinedReducer(initState: T) {
    const [state, dispatch] = useReducer(reducer, initState)
    function dispatcher<A extends K>(action: A) {
      return function dispatchAction(args: M[K]) {
        dispatch({
          action,
          args
        })
      }
    }
    return [state, dispatcher] as [state: T, dispatcher: typeof dispatcher]
  }
}

/**
 * A parametrised quantum of mutation that returns the mutated state.
 */
export type Reduction<T> = (prevState: T, ...args: any[]) => T

/**
 * Extracts those parameters of a function that follow the first
 */
export type LaterParameters<T> = T extends (...args: [first: any, ...args: infer P]) => any ? P : never

/**
 * A generic interface for keys passed to reduction-based reducers.
 */
export interface ReductionKey<T, R extends Record<string, Reduction<T>>, K extends keyof R> extends ReducerKey<K, LaterParameters<R[K]>> {
}

/**
 * Defines a reducer that keys into reductions to dispatch parametrised actions.
 */
export function defineReduction<T, R extends Record<string, Reduction<T>>>(reductions: R) {
  const reducer = <K extends keyof R>(prevState: T, { action, args }: ReductionKey<T, R, K>) => reductions[action](prevState, ...args)
  return {
    useReduction: defineReducer<T, ReductionKey<T, R, keyof R>>(reducer),
    reducer
  }
}

/**
 * A generic interface for keys passed to model reducers.
 */
export interface UpdateKey<T, K extends keyof T> extends ReducerKey<K, T[K]> {
}

/**
 * Selectively reduces an object model to keywise property value updates
 */
export function modelReducer<T extends object, K extends keyof T>(prevModel: T, { action, args }: UpdateKey<T, K>): T {
  return {
    ...prevModel,
    [action]: args
  }
}

/**
 * Define a model reducer 
 */
export function reduceModel<T extends object, X extends keyof T | '' = ''>() {
  return {
    useReducer: defineReducer<T, UpdateKey<T, Exclude<keyof T, X>>>(modelReducer),
    reducer: modelReducer as <K extends Exclude<keyof T, X>>(prevModel: T, key: UpdateKey<T, K>) => T
  }
}
