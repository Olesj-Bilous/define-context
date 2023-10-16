import { FC } from 'react';
import { fireEvent, render, screen } from "@testing-library/react";
import { defineContext, defineModelHub, defineReduction, reduceModel } from "../src";

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

const adds = (Component: FC) => {
  const counter = render(<Component />).getByLabelText('counter')
  expect(counter.textContent).toBe("0")
  fireEvent.click(counter)
  expect(counter.textContent).toBe("1")
}

const renames = (Component: FC) => {
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
}

const setsName = (Component: FC) => {
  render(<Component />)
  const name = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' })
  expect(name.value).toBe('anonymous')
  fireEvent.change(name, {
    target: {
      value: 'Bond, James'
    }
  })
  expect(name.value).toBe('Bond, James')
}

const setsCounter = (Component: FC) => {
  const counter = render(<Component />).getByLabelText('counter')
  expect(counter.textContent).toBe("0")
  fireEvent.click(counter)
  expect(counter.textContent).toBe("1")
}

const ReductionUser = ({ counter, name, add, rename }: {
  counter: number
  name: string
  add: (amount: number) => void
  rename: (name: string, penalty: number) => void
}) => {
  return <>
    <label htmlFor="0">counter</label>
    <button id="0" onClick={() => add(1)}>{counter}</button>
    <label htmlFor="1">name</label>
    <input id="1" onChange={({ target: { value } }) => rename(value, 1)} value={name} />
  </>
}

const ModelUser = ({ counter, name, setCounter, setName }: {
  counter: number
  name: string
  setCounter: (counter: number) => void
  setName: (name: string) => void
}) => {
  return <>
    <label htmlFor="0">counter</label><button id="0" onClick={() => setCounter(1)}>{counter}</button>
    <label htmlFor="1">name</label><input id="1" onChange={({ target: { value } }) => setName(value)} value={name} />
  </>
}

const reduction = defineReduction({
  add({ counter, ...rest }: Readonly<SomeState>, amount: number) {
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

describe('defineReduction', () => {
  const Component = () => {
    const [{ name, counter }, dispatcher] = reduction.useReducer({
      id: '0',
      name: 'anonymous',
      counter: 0
    })

    const add = dispatcher('add')
    const rename = dispatcher('rename')

    return <ReductionUser {...{ name, counter, add, rename }} />
  }

  it('adds', () => adds(Component))
  it('renames', () => renames(Component))

  const { Provider, useDispatcher, useReducerState } = reduction.defineProvider('Some')

  const Child = () => {
    const dispatcher = useDispatcher()
    const { name } = useReducerState()
    const rename = dispatcher('rename')
    return <>
      <label htmlFor="0">name</label>
      <button id="0" onClick={() => rename('Chiffre, Le', 3)}>{name}</button>
    </>
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

  it('passes dispatcher down through defined context', () => {
    const rendered = render(<ProviderComponent />)
    const name = rendered.getByLabelText('name')
    expect(name.textContent).toBe('Bond, James')
    fireEvent.click(name)
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
    
    return <ModelUser {...{ counter, name, setCounter, setName }} />
  }
  
  it('setsCounter', () => setsCounter(Component))
  it('setsName', () => setsName(Component))
})

describe('defineModelHub', () => {
  const modelHub = defineModelHub<SomeState, typeof reduction.reductions>(reduction.reductions)<'id'>()

  const ActionComponent = () => {
    const [{ name, counter }, dispatcher] = modelHub.useReducerHub({
      id: '0',
      name: 'anonymous',
      counter: 0
    })

    const action = dispatcher('action')
    const add = action('add')
    const rename = action('rename')

    return <>
      <ReductionUser {...{ name, counter, add, rename }} />
    </>
  }

  const ModelComponent = () => {
    const [{ name, counter }, dispatcher] = modelHub.useReducerHub({
      id: '0',
      name: 'anonymous',
      counter: 0
    })

    const setProperty = dispatcher('model')
    const setCounter = setProperty('counter')
    const setName = setProperty('name')
    //const setId = setProperty('id') // not assignable

    return <>
      <ModelUser {...{ counter, name, setCounter, setName }} />
    </>
  }

  it('adds', () => adds(ActionComponent))
  it('renames', () => renames(ActionComponent))
  it('setsCounter', () => setsCounter(ModelComponent))
  it('setsName', () => setsName(ModelComponent))
})
