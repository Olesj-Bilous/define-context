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
 * A generic interface for the `action` parameter to generic reducers.
 */
export interface ReducerAction<
  R extends Record<string, any[]>,
  K extends keyof R
> {
  /**
   * A key into a virtual args record.
   */
  action: K
  /**
   * The args corresponding to `action`.
   */
  args: R[K]
}

/**
 * A generic interface for the `action` parameter to hub-based reducers.
 */
export interface ReducerHubAction<
  R extends Record<string, Record<string, any[]>>,
  K extends keyof R,
  L extends keyof R[K]
> extends ReducerAction<R[K], L> {
  reducer: K
}

/**
 * A reducer whose actions provide a key into a virtual args record along with a correspondingly typed args array.
 */
export interface GenericReducer<
  T,
  R extends Record<string, any[]>
> {
  <K extends keyof R>(
    prevState: Readonly<T>,
    action: ReducerAction<R, K>
  ): T
}

/**
 * A reducer that acts as a hub between multiple reducers.
 */
export interface ReducerHub<
  T,
  R extends Record<string, Record<string, any[]>>
> {
  <
    K extends keyof R,
    L extends keyof R[K]
  >(
    prevState: Readonly<T>,
    action: ReducerHubAction<R, K, L>
  ): T
}

/**
 * Chains a key into a virtual args record to dispatch of the correspondingly typed args.
 */
export interface Dispatcher<
  R extends Record<string, any[]>
> {
  <K extends keyof R & string>(action: K): {
    (...args: R[K]): void
  }
}

/**
 * Keys into the hub for a dispatcher.
 */
export interface DispatcherHub<
  R extends Record<string, Record<string, any[]>>
> {
  <K extends keyof R & string>(reducer: K): Dispatcher<R[K]>
}

/**
 * Initialises `React.useReducer` with a generic reducer,
 * wraps `dispatch` with a dispatcher
 * and enables definition of a provider.
 */
export function defineReducer<
  T,
  R extends Record<string, any[]>
>(reducer: GenericReducer<T, R>) {
  function useDefinedReducer(initState: T): [state: T, dispatcher: Dispatcher<R>] {
    const [state, dispatch] = useReducer(reducer, initState)
    return [state, (action) => (...args) => dispatch({ action, args })]
  }
  return {
    reducer,
    useReducer: useDefinedReducer,
    defineProvider(descriptor: string) {
      return defineProvider(descriptor, useDefinedReducer)
    }
  }
}

/**
 * Defines a hub-based reducer hook.
 */
export function defineReducerHub<
  T,
  R extends Record<string, Record<string, any[]>>
>(reducer: ReducerHub<T, R>) {
  function useReducerHub(initState: T): [state: T, dispatcher: DispatcherHub<R>] {
    const [state, dispatch] = useReducer(reducer, initState)
    return [state, (reducer) => (action) => (...args) => dispatch({ reducer, action, args })]
  }
  return {
    reducer,
    useReducerHub,
    defineProvider(descriptor: string) {
      return defineProvider(descriptor, useReducerHub)
    }
  }
}

/**
 * Defines a provider for a particular reducer hook.
 */
export function defineProvider<T, D>(descriptor: string, useDefinedReducer: (initState: T) => [state: T, dispatcher: D]) {
  const [StateContext, useReducerState] = defineContext<T>(descriptor, 'state')
  const [DispatcherContext, useDispatcher] = defineContext<D>(descriptor, 'dispatcher')
  function Provider({ initState, children }: { initState: T, children?: ReactNode }): JSX.Element {
    const [state, dispatcher] = useDefinedReducer(initState)
    return <StateContext.Provider value={state}>
      <DispatcherContext.Provider value={dispatcher}>
        {children}
      </DispatcherContext.Provider>
    </StateContext.Provider>
  }
  return {
    Provider,
    useReducerState,
    useDispatcher
  }
}

/**
 * A parametrised update quantum that should return the immutably updated state.
 */
export type Reduction<T, A extends any[]> = (prevState: Readonly<T>, ...args: A) => T

/**
 * Extracts those parameters of a function that follow the first.
 */
export type LaterParameters<T> = T extends (...args: [first: any, ...args: infer P]) => any ? P : never

/**
 * Maps a record of functions to a record of their later parameters.
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
export function defineReduction<T, R extends Record<string, Reduction<T, any[]>>>(reductions: R) {
  return {
    ...defineReducer(
      <K extends keyof R>(
        prevState: Readonly<T>,
        { action, args }: ReductionAction<R, K>
      ): T => reductions[action]?.(prevState, ...args) ?? prevState
    ),
    reductions
  }
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
export function modelReducer<T, K extends keyof T>(
  prevModel: Readonly<T>,
  { action: key, args: [value] }: UpdateAction<T, K>
): T {
  return {
    ...prevModel,
    [key]: value
  }
}

/**
 * Constrains a generic model reducer to a specific type, optionally omitting some property keys.
 */
export interface ConstrainedUpdate<T, X extends keyof T | '' = ''> {
  <K extends Exclude<keyof T, X>>(prevModel: Readonly<T>, action: UpdateAction<Omit<T, X>, K>): T
}

/**
 * Define a model reducer, optionally omitting some property keys.
 */
export function reduceModel<T extends object, X extends keyof T | '' = ''>() {
  return defineReducer<T, SingleArgMap<Omit<T, X>>>(modelReducer as ConstrainedUpdate<T, X>)
}

/**
 * Fuse a record of generic reducers into a hub.
 */
export function fuseReducers<T,
  R extends Record<string, Record<string, any[]>>
>(reducers: {
  [K in keyof R]: GenericReducer<T, R[K]>
}): ReducerHub<T, R> {
  return function reducer<
    K extends keyof R,
    L extends keyof R[K]
  >(
    prevState: Readonly<T>,
    { action, reducer, args }: ReducerHubAction<R, K, L>
  ) {
    return reducers[reducer]?.(prevState, { action, args }) ?? prevState
  }
}

/**
 * Fuse a model into a hub with a custom reduction-based reducer.
 */
export function enhanceModel<
  T,
  R extends Record<string, Reduction<T, any[]>>
>(reductions: R) {
  return <X extends keyof T | '' = ''>() => {
    return fuseReducers<T, {
      model: SingleArgMap<Omit<T, X>>;
      action: LaterParametersMap<R>;
    }>({
      model: modelReducer as ConstrainedUpdate<T, X>,
      action: defineReduction<T, R>(reductions).reducer
    })
  }
}

/**
 * Define a hook into a reducer hub based on a reduction-enhanced model.
 */
export function defineModelHub<
  T,
  R extends Record<string, Reduction<T, any[]>>
>(reductions: R) {
  return <X extends keyof T | '' = ''>() => {
    return defineReducerHub(enhanceModel<T, R>(reductions)<X>())
  }
}
