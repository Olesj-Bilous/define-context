import { Context, createContext, useContext } from "react";

export default function defineContext<C>(
  descriptor: string,
  valueDescriptor?: string
): [
    Context: Context<null | C>,
    hook: () => NonNullable<C>
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
