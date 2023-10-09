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

## NEW! define reduction

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
```tsx
const [{name, counter}, dispatcher] = reduction.useReduction({
  name: 'anonymous',
  counter: 0
})
const add = dispatcher('add')
const rename = dispatcher('rename')
return <>
  <button 
    onClick={() => add.dispatch(1)}
  >
    {counter}
  </button>
  <button 
    onClick={() => rename.dispatch('Bond, James', 1)} 
    disabled={counter < 1}
  >
    {name}
  </button>
</>
```
