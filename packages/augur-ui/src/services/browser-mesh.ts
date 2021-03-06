import type {
  Config,
  ContractAddresses as ZeroXContractAddresses,
} from '@0x/mesh-browser-lite';
// import type {
//   ContractAddresses,
// } from '@augurproject/utils';

import { SubscriptionEventName } from '@augurproject/sdk-lite';
import type { ZeroX } from '@augurproject/sdk';

import { NetworkId, SDKConfiguration, ContractAddresses } from "@augurproject/utils";
import * as Comlink from 'comlink';
import { SupportedProvider } from 'ethereum-types';
import './MeshTransferHandler';

/**
 * @forceIgnoreCustomAddresses: bool - Pass if you're attempting to restart a
 * browser mesh that has crashed. ZeroX will error if the custom addresses
 * are specified multiple times.
 */
function createBrowserMeshConfig(
  ethereumRPCURL: string,
  web3Provider: SupportedProvider,
  ethereumChainID: number,
  contractAddresses: ContractAddresses,
  verbosity = 5,
  useBootstrapList: boolean,
  bootstrapList: string[],
  forceIgnoreCustomAddresses = false
) {
  const meshConfig: Config = {
    ethereumChainID,
    verbosity,
    useBootstrapList,
    bootstrapList,
  };

  if (web3Provider) {
    meshConfig.web3Provider = web3Provider;
  } else if (ethereumRPCURL) {
    meshConfig.ethereumRPCURL = ethereumRPCURL;
  } else {
    throw new Error('No Web3 provider or RPC URL provided to Browser Mesh');
  }

  if (
    ![NetworkId.Kovan, NetworkId.Mainnet].includes(
      ethereumChainID.toString() as NetworkId
    ) &&
    !forceIgnoreCustomAddresses
  ) {
    // Our contract addresses have a different type than `customContractAddresses` but the 0x code
    // normalizes them so it still works. Thus, we just cast it here.
    meshConfig.customContractAddresses = (contractAddresses as unknown) as ZeroXContractAddresses;
  }

  meshConfig.customOrderFilter = {
    properties: {
      makerAssetData: {
        pattern: `.*${contractAddresses.ZeroXTrade.slice(2).toLowerCase()}.*`,
      },
    },
  };

  return meshConfig;
}

function createBrowserMeshRestartFunction(
  meshConfig: Config,
  web3Provider: SupportedProvider,
  zeroX: ZeroX,
  sdkConfig: SDKConfiguration
) {
  return (err) => {
    console.error('Browser mesh error: ', err.message, err.stack);
    console.log('Restarting Mesh Sync');
    zeroX.client.events.emit(SubscriptionEventName.ZeroXStatusError, {
      error: err,
    });

    import(/* webpackChunkName: 'mesh-browser-lite' */ '@0x/mesh-browser-lite').then(({Mesh}) => {
      const mesh = new Mesh(
        createBrowserMeshConfig(
          meshConfig.ethereumRPCURL,
          web3Provider,
          meshConfig.ethereumChainID,
          sdkConfig.addresses,
          meshConfig.verbosity,
          meshConfig.useBootstrapList,
          meshConfig.bootstrapList,
          true
        )
      );
      mesh.onError(createBrowserMeshRestartFunction(meshConfig, web3Provider, zeroX, sdkConfig));
      mesh.startAsync().then(() => {
        zeroX.mesh = mesh;
      })
    });
  };
}

export async function createBrowserMeshWorker(
  config: SDKConfiguration,
  web3Provider: SupportedProvider,
  zeroX: ZeroX
) {
  let addresses;
  if(config.paraDeploy) {
    const paraDeployAddresses = config.paraDeploys[config.paraDeploy];
    if(!paraDeployAddresses) throw new Error('Specified ParaDeploy does not exist in config.');
    addresses = {
      ...config.addresses,
      ...paraDeployAddresses.addresses
    };
  } else {
    addresses = config.addresses;
  }

  if (!config.zeroX?.mesh?.enabled) {
    throw new Error(
      `Attempting to create browser mesh without it being enabled in config ${JSON.stringify(
        config
      )}`
    );
  }

  try {
    const meshConfig = createBrowserMeshConfig(
      config.ethereum.http,
      undefined,
      Number(config.networkId),
      addresses,
      config.zeroX.mesh.verbosity || 5,
      config.zeroX.mesh.useBootstrapList,
      config.zeroX.mesh.bootstrapList
    );

    const meshWorker = new Worker('./MeshWorker', { type: 'module' });

    const {
      getOrdersAsync,
      startAsync,
      startMesh,
      loadMesh,
      onOrderEvents,
      addOrdersAsync,
      onError,
    } = Comlink.wrap(meshWorker);
    await loadMesh();
    onError(Comlink.proxy(function (err) {
      console.error('Browser mesh error: ', err.message, err.stack);
      console.log('Restarting Mesh Sync');
      zeroX.client.events.emit(SubscriptionEventName.ZeroXStatusError, {
        error: err,
      });
      meshWorker.terminate();
      createBrowserMeshWorker(config, web3Provider, zeroX);
    }));

    await startMesh(
      {
        ...meshConfig,
        web3Provider: undefined,
      },
      Comlink.proxy(web3Provider.sendAsync.bind(web3Provider))
    );

    const wrappedMesh = new Proxy(
      {
        getOrdersAsync,
        onOrderEvents,
        addOrdersAsync,
        onError,
      },
      {
        get(target: any, prop: any): any {
          if (prop === 'onOrderEvents') {
            return new Proxy(target[prop], {
              apply(target: any, thisArg: any, argArray = []): any {
                const [cb, ...rest] = argArray;
                return target(Comlink.proxy(cb), ...rest);
              },
            });
          }
          return target[prop];
        },
      }
    );

    await startAsync();
    zeroX.mesh = wrappedMesh;
  } catch (error) {
    zeroX.client.events.emit(SubscriptionEventName.ZeroXStatusError, { error });

    throw error;
  }
}
