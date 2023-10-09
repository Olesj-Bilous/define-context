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
 * A parametrised quantum of mutation that returns the mutated state
 */
export type Reduction<T> = (prevState: T, ...args: unknown[]) => T

type ActionKey<T, R extends Record<string, Reduction<T>>, K extends keyof R> = {
  action: K
  args: Parameters<R[K]>
}

/**
 * Prepares a wrapper around `React.useReducer`
 * that will return a dispatcher that keys into `reductions`
 * to prepare dispatch of parametrised actions.
 */
export function defineReduction<T, R extends Record<string, Reduction<T>>>(reductions: R) {
  const reducer = <K extends keyof R>(prevState: T, { action, args }: ActionKey<T, R, K>) => reductions[action](prevState, ...args)
  return {
    useReduction: (initState: T) => {
      const [state, dispatch] = useReducer(reducer, initState)
      function dispatcher<K extends keyof R>(action: K) {
        return {
          dispatch(...args: Parameters<R[K]>) {
            return dispatch({ action, args })
          }
        }
      }
      return [state, dispatcher] as [state: T, dispatcher: typeof dispatcher]
    }
  }
}
