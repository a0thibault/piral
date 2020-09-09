import { PiralPlugin } from 'piral-core';
import { AdalClient } from './setup';
import { PiralAdalApi } from './types';

/**
 * Creates new Pilet API extensions for the integration of MSAL.
 */
export function createAdalApi(client: AdalClient): PiralPlugin<PiralAdalApi> {
  return context => {
    context.on('before-fetch', client.extendHeaders);

    return {
      getAccessToken() {
        return client.token();
      },
    };
  };
}
