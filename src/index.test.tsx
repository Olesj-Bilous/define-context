import { fireEvent, render, screen } from "@testing-library/react";
import defineContext, { defineReduction } from ".";

interface SomeContext {
  someValue?: boolean
}

describe('defineContext', () => {
  const [SomeContext, useSomeContext] = defineContext<SomeContext>('Some', 'some')
  const Child = ({ order }: { order?: string }) => {
    const { someValue } = useSomeContext()
    return <label data-testid={order}>{someValue ? 'some truthy value' : 'some falsy value'}</label>
  }

  it('makes value available to ancestors of context using the hook', () => {
    render(<>
      <SomeContext.Provider value={{}}>
        <Child order="0" />
      </SomeContext.Provider>
      <SomeContext.Provider value={{
        someValue: true
      }}>
        <Child order="1" />
      </SomeContext.Provider>
    </>)
    expect(screen.getByTestId('0').textContent).toBe('some falsy value')
    expect(screen.getByTestId('1').textContent).toBe('some truthy value')
  })

  it('throws when no value has been provided', () => {
    expect(() => render(<SomeContext.Provider value={null}>
      <Child />
    </SomeContext.Provider>)).toThrow('No some value was provided to SomeContext')
  })
})

interface SomeState {
  name: string
  counter: number
}

describe('defineReduction', () => {
  const reduction = defineReduction({
    add({ counter, ...rest }: SomeState, amount: number) {
      return {
        counter: counter + amount,
        ...rest
      }
    },
    rename(state, name: string, penalty: number) {
      return {
        ...state,
        name: name + penalty
      }
    }
  })
  const Component = () => {
    const [{name, counter}, dispatcher] = reduction.useReduction({
      name: 'anonymous',
      counter: 0
    })
    const add = dispatcher('add')
    return <><label htmlFor="0">{name}</label><button id="0" onClick={() => add.dispatch(1)}>{ counter}</button></>
  }
  it('adds', () => {
    const rendered = render(<Component />).getByLabelText('anonymous')
    expect(rendered.textContent).toBe("0")
    fireEvent.click(rendered)
    expect(rendered.textContent).toBe("1")
  })
})
