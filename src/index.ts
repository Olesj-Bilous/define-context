import { Context, createContext, useContext, useReducer } from "react";

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
 * A parametrised quantum of mutation that returns the mutated state.
 */
export type Reduction<T, A extends any[] = any[]> = (prevState: T, ...args: A) => T

/**
 * Maps model property keys to a reduction that takes the corresponding property value as single argument
 */
export type ModelReductionMap<T> = {
  [K in keyof T]: Reduction<T, [value: T[K]]>
}

/**
 * A generic interface for the `action` parameter to reducers.
 */
export interface ReducerAction<A, P> {
  action: A
  args: P
}

/**
 * Extracts those parameters of a function that follow the first
 */
export type LaterParameters<T> = T extends (...args: [first: any, ...args: infer P]) => any ? P : never

/**
 * A generic interface for the `action` passed to reduction-based reducers.
 */
export interface ReductionAction<T, R extends Record<string, Reduction<T>>, K extends keyof R> extends ReducerAction<K, LaterParameters<R[K]>> {
}

/**
 * A reducer whose actions provide a key into a reduction map as well as arguments to the corresponding reduction
 */
export type GenericReducer<
  T,
  R extends Record<string, Reduction<T>> = ModelReductionMap<T>,
  X extends keyof R | '' = ''
> = <K extends keyof Omit<R, X>>(prevState: T, key: ReductionAction<T, R, K>) => T

/**
 * Chains a key into a reduction map to dispatch of arguments to the corresponding reduction
 */
export type Dispatcher<
  T,
  R extends Record<string, Reduction<T>> = ModelReductionMap<T>,
  X extends keyof R | '' = ''
> = <K extends keyof Omit<R, X>>(action: K) => (...args: LaterParameters<R[K]>) => void

/**
 * Initialises a dispatcher-wrapped `React.useReducer` with a reduction-based reducer
 * and allows definition of a dispatcher context
 */
export function defineReducer<
  T,
  R extends Record<string, Reduction<T>> = ModelReductionMap<T>,
  X extends keyof R | '' = ''
>(reducer: GenericReducer<T, R, X>) {
  return {
    reducer,
    useReducer(initState: T): [state: T, dispatcher: Dispatcher<T, R, X>] {
      const [state, dispatch] = useReducer(reducer, initState)
      return [state, action => (...args) => dispatch({ action, args })]
    },
    defineContext(descriptor: string) {
      return defineContext<Dispatcher<T, R, X>>(descriptor, 'dispatcher')
    }
  }
}

/**
 * Defines a reducer that keys into reductions to dispatch parametrised actions.
 */
export function defineReduction<T, R extends Record<string, Reduction<T>>>(reductions: R) {
  return defineReducer(
    <K extends keyof R>(prevState: T, { action, args }: ReductionAction<T, R, K>) => reductions[action]?.(prevState, ...args) ?? prevState
  )
}

/**
 * A generic interface for the `action` passed to model reducers.
 */
export interface UpdateAction<T, K extends keyof T> extends ReducerAction<K, [value: T[K]]> {
}

/**
 * Reduces an object model to keywise property value updates
 */
export function modelReducer<T extends object, K extends keyof T>(prevModel: T, { action, args: [value] }: UpdateAction<T, K>): T {
  return {
    ...prevModel,
    [action]: value
  }
}

/**
 * Define a model reducer, optionally restricting some property keys
 */
export function reduceModel<T extends object, X extends keyof T | '' = ''>() {
  return defineReducer<T, ModelReductionMap<T>, X>(modelReducer)
}
