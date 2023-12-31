# define context

Define and hook into a typed React Context, assured of a descriptive error message if the value was not provided.
```ts
const [SomeContext, useSomeContext] = defineContext<SomeContext>('Some', 'such')
```

The following will throw:
```tsx
const Child = () => {
  const { someValue } = useSomeContext()
  return <>{someValue}</>
}

render(<SomeContext.Provider value={null}>
  <Child />
</SomeContext.Provider>) // Error! No such value was provided to SomeContext
```

## define reduction

Define key-based reducers before you ever hook into them.
```ts
const reduction = defineReduction({
  add({ counter, ...rest }: SomeState, amount: number) {
    return {
      ...rest,
      counter: counter + amount
    }
  },
  rename({ counter, ...rest }, name: string, penalty: number) {
    return {
      ...rest,
      name,
      counter: counter - penalty
    }
  }
})
```

Initialize the reducer with initial state and pass a strictly typed action key to the dispatcher to dispatch typed arguments to the appropriate action.
```jsx
// dispatcher(action: "add" | "rename"): (...args: [amount: number] | [name: string, penalty: number]) => void
const [{ name, counter }, dispatcher] = reduction.useReducer({
  name: 'anonymous',
  counter: 0
})

const add = dispatcher('add') // <"add">(action: "add") => (amount: number) => void
const rename = dispatcher('rename') // <"rename">(action: "rename") => (name: string, penalty: number) => void

return <>
  <button onClick={() => add(1)}>
    {counter}
  </button>
  <button onClick={() => rename('Bond, James', 1)} disabled={counter < 1}>
    {name}
  </button>
</>
```

You can easily define a provider and hooks into reducer state and dispatcher for its children.
```jsx
const { Provider, useReducerState, useDispatcher } = reduction.defineProvider('Some')

const Child = () => {
  const { name } = useReducerState()
  const dispatcher = useDispatcher()

  const rename = dispatcher('rename')

  return <button onClick={() => rename('Chiffre, Le', 3)}>{name}</button>
}

const ProviderComponent = () => {
  return <Provider initState={{
    id: '0',
    name: 'Bond, James',
    counter: 4
  }}>
    <Child />
  </Provider>
}
```

## reduce model

Selectively reduces an object model to keywise property value updates.
```jsx
const reducedModel = reduceModel<SomeState, 'id'>()

function Component() {
  const [{ counter, name }, dispatcher] = reducedModel.useReducer({
    id: '0',
    name: 'anonymous',
    counter: 0
  })

  const setCounter = dispatcher('counter') // <"counter">(action: "counter") => (arg: number) => void
  const setName = dispatcher('name') // <"name">(action: "name") => (arg: string) => void
  //const setId = dispatcher('id') // 'id' not assignable

  return <>
    <button onClick={() => setCounter(1)}>
      {counter}
    </button>
    <button onClick={() => setName('Bond, James')}>
      {name}
    </button>
  </>
}
```
