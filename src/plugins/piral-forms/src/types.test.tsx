import create from 'zustand';
import * as React from 'react';
import { StateContext } from 'piral-core';
import { DefaultErrorInfo } from 'piral-core/lib/defaults/DefaultErrorInfo.js';
import { render } from '@testing-library/react';
import './types';

const FormErrorInfo = () => <div role="form_error" />;

const mockState = {
  state: create(() => ({
    errorComponents: {
      form: FormErrorInfo,
    },
    registry: {
      extensions: {},
    },
  })),
};

(React as any).useMemo = (cb) => cb();

describe('Extended Error Info Component for Forms', () => {
  it('renders the switch-case in the form error case', () => {
    const node = render(
      <StateContext.Provider value={mockState as any}>
        <DefaultErrorInfo type="form" error="foo" />
      </StateContext.Provider>,
    );
    expect(node.getAllByRole('form_error').length).toBe(1);
  });
});
