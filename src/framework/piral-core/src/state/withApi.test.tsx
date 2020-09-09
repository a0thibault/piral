import * as React from 'react';
import * as hooks from '../hooks';
import { mount } from 'enzyme';
import { Atom } from '@dbeining/react-atom';
import { withApi } from './withApi';
import { ComponentConverters } from '../types';
import { StateContext } from '../state';

function createMockContainer() {
  const state = Atom.of({
    portals: {},
  });
  return {
    context: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      state,
      destroyPortal: id => {},
    } as any,
  };
}

jest.mock('../hooks');

(hooks as any).useGlobalState = (select: any) =>
  select({
    components: {
      ErrorInfo: StubErrorInfo,
    },
  });

(hooks as any).useActions = () => ({
  destroyPortal: jest.fn(),
});

const StubErrorInfo: React.FC = props => <div />;
StubErrorInfo.displayName = 'StubErrorInfo';

const StubComponent: React.FC<{ shouldCrash?: boolean }> = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('I should crash!');
  }
  return <div />;
};
StubComponent.displayName = 'StubComponent';

describe('withApi Module', () => {
  it('wraps a component and forwards the API as piral', () => {
    const api: any = {};
    const Component = withApi({}, StubComponent, api, 'feed');
    const node = mount(<Component />);
    expect(
      node
        .find(StubComponent)
        .first()
        .prop('piral'),
    ).toBe(api);
  });

  it('is protected against a component crash', () => {
    console.error = jest.fn();
    const api: any = {};
    const Component = withApi({}, StubComponent, api, 'feed');
    const node = mount(<Component shouldCrash />);
    expect(
      node
        .find(StubErrorInfo)
        .first()
        .prop('type'),
    ).toBe('feed');
  });

  it('reports to console.error when an error is hit', () => {
    console.error = jest.fn();
    const api: any = {
      meta: {
        name: 'my pilet',
      },
    };
    const Component = withApi({}, StubComponent, api, 'feed');
    mount(<Component shouldCrash />);
    expect(console.error).toHaveBeenCalled();
  });

  it('Wraps component of type object', () => {
    const api: any = {};
    const converters: ComponentConverters<any> = {
      html: component => {
        return component.component;
      },
    };
    const context = createMockContainer();
    const Component = withApi(converters, { type: 'html', component: { mount: () => {} } }, api, 'unknown');

    const node = mount(
      <StateContext.Provider value={context.context}>
        <Component />
      </StateContext.Provider>,
    );

    expect(node.children.length).toBe(1);
  });

  it('Wraps component which is object == null.', () => {
    const api: any = {};
    const converters: ComponentConverters<any> = {
      html: component => {
        return component.component;
      },
    };
    const context = createMockContainer();
    const Component = withApi(converters, null, api, 'unknown');

    const node = mount(
      <StateContext.Provider value={context.context}>
        <Component />
      </StateContext.Provider>,
    );

    expect(Component.displayName).toBeUndefined();
  });
});
