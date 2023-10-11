import { Context, ReactNode, createContext, useContext, useReducer } from "react";

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
 * A generic interface for the `action` parameter to reducers.
 */
export interface ReducerAction<R extends Record<string, any[]>, K extends keyof R> {
  action: K
  args: R[K]
}

/**
 * A reducer whose actions provide a key into an args record and the corresponding args array.
 */
export type GenericReducer<
  T,
  R extends Record<string, any[]> = Record<string, never[]>,
  X extends keyof R | '' = ''
> = <K extends keyof Omit<R, X>>(prevState: T, action: ReducerAction<R, K>) => T

/**
 * Chains a key into an args record to dispatch of the corresponding args.
 */
export type Dispatcher<
  R extends Record<string, any[]> = Record<string, any[]>,
  X extends keyof R | '' = ''
> = <K extends keyof Omit<R, X>>(action: K) => (...args: R[K]) => void

/**
 * Initialises `React.useReducer` with a generic reducer,
 * wraps `dispatch` with a dispatcher
 * and allows definition of a dispatcher context.
 */
export function defineReducer<
  T,
  R extends Record<string, any[]> = Record<string, any[]>,
  X extends keyof R | '' = ''
>(reducer: GenericReducer<T, R, X>) {
  function useDefinedReducer(initState: T): [state: T, dispatcher: Dispatcher<R, X>] {
    const [state, dispatch] = useReducer(reducer, initState)
    return [state, action => (...args) => dispatch({ action, args })]
  }
  return {
    reducer,
    useReducer: useDefinedReducer,
    defineProvider(descriptor: string) {
      const [StateContext, useStateContext] = defineContext<T>(descriptor, 'state')
      const [DispatcherContext, useDispatcher] = defineContext<Dispatcher<R, X>>(descriptor, 'dispatcher')
      function Provider({ initState, children }: { initState: T, children?: ReactNode }) {
        const [state, dispatcher] = useDefinedReducer(initState)
        return <StateContext.Provider value={state}>
          <DispatcherContext.Provider value={dispatcher}>
            {children}
          </DispatcherContext.Provider>
        </StateContext.Provider>
      }
      return Provider
    }
  }
}

/**
 * A parametrised update quantum that should return the updated state immutably.
 */
export type Reduction<T, A extends any[] = any[]> = (prevState: Readonly<T>, ...args: A) => T

/**
 * Extracts those parameters of a function that follow the first
 */
export type LaterParameters<T> = T extends (...args: [first: any, ...args: infer P]) => any ? P : never

/**
 * Maps a record of functions to a record of their later parameters
 */
export type LaterParametersMap<T> = {
  [K in keyof T]: LaterParameters<T[K]>
}

/**
 * A generic interface for the `action` parameter to reduction-based reducers.
 */
export type ReductionAction<R, K extends keyof R> = ReducerAction<LaterParametersMap<R>, K>

/**
 * Defines a reducer that keys into `reductions` to dispatch parametrised actions.
 */
export function defineReduction<T, R extends Record<string, Reduction<T>>>(reductions: R) {
  return defineReducer(
    <K extends keyof R>(prevState: T, { action, args }: ReductionAction<R, K>) => reductions[action]?.(prevState, ...args) ?? prevState
  )
}

/**
 * For each key the corresponding value is mapped to a single-element tuple.
 */
export type SingleArgMap<T> = {
  [K in keyof T]: [arg: T[K]]
}

/**
 * A generic interface for the `action` passed to model reducers.
 */
export interface UpdateAction<T, K extends keyof T> extends ReducerAction<SingleArgMap<T>, K> {
}

/**
 * Reduces an object model to keywise property value updates.
 */
export function modelReducer<T extends object, K extends keyof T>(prevModel: T, { action, args: [value] }: UpdateAction<T, K>): T {
  return {
    ...prevModel,
    [action]: value
  }
}

/**
 * Define a model reducer, optionally restricting some property keys.
 */
export function reduceModel<T extends object, X extends keyof T | '' = ''>() {
  return defineReducer<T, SingleArgMap<T>, X>(modelReducer)
}
