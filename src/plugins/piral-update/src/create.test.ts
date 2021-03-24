import { Atom, swap } from '@dbeining/react-atom';
import { createUpdateApi } from './create';

function createMockContainer() {
  const state = Atom.of({});
  return {
    context: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      defineActions() {},
      state,
      dispatch(update) {
        swap(state, update);
      },
    } as any,
    api: {} as any,
  };
}

const moduleMetadata = {
  name: 'my-module',
  version: '1.0.0',
  link: undefined,
  custom: undefined,
  hash: '123',
};

describe('Create Update API Extensions', () => {
  it('createUpdateApi can set updatability', () => {
    const container = createMockContainer();
    container.context.setUpdateMode = jest.fn();
    const api = (createUpdateApi()(container.context) as any)(container.api, moduleMetadata);
    api.canUpdate('allow');
    expect(container.context.setUpdateMode).toHaveBeenCalledTimes(1);
    api.canUpdate('block');
    expect(container.context.setUpdateMode).toHaveBeenCalledTimes(2);
  });
});
