import { render, screen } from "@testing-library/react";
import defineContext from ".";

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
