import { fireEvent, render, screen } from "@testing-library/react";
import defineContext, { defineReduction, reduceModel } from "../src";

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
  id: string
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
    const [{ name, counter }, dispatcher] = reduction.useReducer({
      id: '0',
      name: 'anonymous',
      counter: 0
    })
    const add = dispatcher('add')
    const rename = dispatcher('rename')
    return <>
      <label htmlFor="0">counter</label>
      <button id="0" onClick={() => add(1)}>{counter}</button>
      <label htmlFor="1">name</label>
      <input id="1" onChange={({ target: { value } }) => rename(value, 1)} value={name} />
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
    const name = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' })
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
  
  const [SomeDispatcherContext, useSomeDispatcher] = reduction.defineContext('Some')
  const Child = () => {
    const dispatcher = useSomeDispatcher()
    const rename = dispatcher('rename')
    return <>
      <label htmlFor="0">bonjour</label>
      <button id="0" onClick={() => rename('Chiffre, Le', 3)}></button>
    </>
  }
  const Provider = () => {
    const [{ name }, dispatcher] = reduction.useReducer({
      id: '0',
      name: 'Bond, James',
      counter: 4
    })
    return <SomeDispatcherContext.Provider value={dispatcher}>
      <span data-testid="0">{name}</span>
      <Child />
    </SomeDispatcherContext.Provider>
  }
  it('passes dispatcher down through defined context', () => {
    const rendered = render(<Provider />)
    const name = rendered.getByTestId('0')
    expect(name.textContent).toBe('Bond, James')
    fireEvent.click(rendered.getByLabelText('bonjour'))
    expect(name.textContent).toBe('Chiffre, Le')
  })
})

describe('reduceModel', () => {
  const reducedModel = reduceModel<SomeState, 'id'>()
  const Component = () => {
    const [{ counter, name }, dispatcher] = reducedModel.useReducer({
      id: '0',
      name: 'anonymous',
      counter: 0
    })
    const setCounter = dispatcher('counter')
    const setName = dispatcher('name')
    //const setId = dispatcher('id') // not assignable
    return <>
      <label htmlFor="0">counter</label><button id="0" onClick={() => setCounter(1)}>{counter}</button>
      <label htmlFor="1">name</label><input id="1" onChange={({ target: { value } }) => setName(value)} value={name} />
    </>
  }
  it('setsCounter', () => {
    const counter = render(<Component />).getByLabelText('counter')
    expect(counter.textContent).toBe("0")
    fireEvent.click(counter)
    expect(counter.textContent).toBe("1")
  })
  it('setsName', () => {
    render(<Component />)
    const name = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' })
    expect(name.value).toBe('anonymous')
    fireEvent.change(name, {
      target: {
        value: 'Bond, James'
      }
    })
    expect(name.value).toBe('Bond, James')
  })
})
