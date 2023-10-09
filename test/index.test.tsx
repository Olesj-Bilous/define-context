import { fireEvent, render, screen } from "@testing-library/react";
import defineContext, { defineReduction } from "../src";

interface SomeContext {
  someValue?: boolean
}

describe('defineContext', () => {
  const [SomeContext, useSomeContext] = defineContext<SomeContext>('Some', 'such')
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
    </SomeContext.Provider>)).toThrow('No such value was provided to SomeContext')
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
    rename({ counter, ...rest }, name: string, penalty: number) {
      return {
        ...rest,
        name: name,
        counter: counter - penalty
      }
    }
  })
  const Component = () => {
    const [{ name, counter }, dispatcher] = reduction.useReduction({
      name: 'anonymous',
      counter: 0
    })
    const add = dispatcher('add')
    const rename = dispatcher('rename')
    return <>
      <label htmlFor="0">counter</label><button id="0" onClick={() => add.dispatch(1)}>{counter}</button>
      <label htmlFor="1">name</label><input id="1" onChange={({ target: { value } }) => rename.dispatch(value, 1)} value={name} />
    </>
  }
  it('adds', () => {
    const counter = render(<Component />).getByLabelText('counter')
    expect(counter.textContent).toBe("0")
    fireEvent.click(counter)
    expect(counter.textContent).toBe("1")
  })
  it('renames', () => {
    const rendered = render(<Component />)
    const name = screen.getByRole<HTMLInputElement>('textbox', {name: 'name'})
    const counter = rendered.getByLabelText('counter')
    expect(name.value).toBe('anonymous')
    expect(counter.textContent).toBe("0")
    fireEvent.change(name, {
      target: {
        value: 'Bond, James'
      }
    })
    expect(name.value).toBe('Bond, James')
    expect(counter.textContent).toBe("-1")
  })
})
