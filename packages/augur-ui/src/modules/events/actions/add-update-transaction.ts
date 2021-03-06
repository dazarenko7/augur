import {
  CANCELORDER,
  CANCELORDERS,
  BATCHCANCELORDERS,
  TX_ORDER_ID,
  CREATEMARKET,
  CREATECATEGORICALMARKET,
  CREATESCALARMARKET,
  CREATEYESNOMARKET,
  CREATE_MARKET,
  CATEGORICAL,
  SCALAR,
  YES_NO,
  PUBLICFILLORDER,
  CREATEAUGURWALLET,
  WITHDRAWALLFUNDSASDAI,
  ADDLIQUIDITY,
  SWAPEXACTTOKENSFORTOKENS,
  SWAPETHFOREXACTTOKENS,
  SWAPTOKENSFOREXACTETH,
  SENDETHER,
  BUYPARTICIPATIONTOKENS,
  TRANSFER,
  MODAL_ERROR,
  MIGRATE_FROM_LEG_REP_TOKEN,
  APPROVE_FROM_LEG_REP_TOKEN,
  REDEEMSTAKE,
  MIGRATEOUTBYPAYOUT,
  TRADINGPROCEEDSCLAIMED,
  CLAIMMARKETSPROCEEDS,
  FORKANDREDEEM,
  FINALIZE,
  DOINITIALREPORT,
  CONTRIBUTE,
  APPROVE,
  SETREFERRER,
  SETAPPROVALFORALL,
  TRANSACTIONS,
} from 'modules/common/constants';
import { CreateMarketData } from 'modules/types';
import {
  Events,
  TXEventName,
  parseZeroXMakerAssetData
} from '@augurproject/sdk-lite';
import {
  addPendingData,
  addUpdatePendingTransaction,
  addCanceledOrder,
  updatePendingReportHash,
  updatePendingDisputeHash,
  removePendingDataByHash,
  updatePendingQueue,
} from 'modules/pending-queue/actions/pending-queue-management';
import { convertUnixToFormattedDate } from 'utils/format-date';
import { TransactionMetadataParams } from '@augurproject/contract-dependencies-ethers';
import { generateTxParameterId } from 'utils/generate-tx-parameter-id';
import { addAlert, updateAlert } from 'modules/alerts/actions/alerts';
import { getDeconstructedMarketId } from 'modules/create-market/helpers/construct-market-params';
import { AppStatus } from 'modules/app/store/app-status';
import { PendingOrders } from 'modules/app/store/pending-orders';

const ADD_PENDING_QUEUE_METHOD_CALLS = [
  BUYPARTICIPATIONTOKENS,
  MIGRATE_FROM_LEG_REP_TOKEN,
  APPROVE_FROM_LEG_REP_TOKEN,
  BATCHCANCELORDERS,
  TRADINGPROCEEDSCLAIMED,
  MIGRATEOUTBYPAYOUT,
  FORKANDREDEEM,
  CREATEAUGURWALLET,
  WITHDRAWALLFUNDSASDAI,
  ADDLIQUIDITY,
  SWAPEXACTTOKENSFORTOKENS,
  SWAPTOKENSFOREXACTETH,
  SWAPETHFOREXACTTOKENS,
  SENDETHER,
  TRANSFER,
  FINALIZE,
  APPROVE,
  SETREFERRER,
  SETAPPROVALFORALL,
];

export const addUpdateTransaction = async (txStatus: Events.TXStatus) => {
  const { eventName, transaction, hash } = txStatus;
  if (transaction) {
    const {
      loginAccount: { meta },
    } = AppStatus.get();
    const methodCall = transaction.name.toUpperCase();

    if (ADD_PENDING_QUEUE_METHOD_CALLS.includes(methodCall)) {
      addUpdatePendingTransaction(methodCall, eventName, hash, {
        ...transaction,
      });
    }

    if (eventName === TXEventName.RelayerDown) {
      const hasEth = (
        await meta.signer.provider.getBalance(meta.signer._address)
      ).gt(0);

      AppStatus.actions.setModal({
        type: MODAL_ERROR,
        error: getRelayerDownErrorMessage(meta.accountType, hasEth),
        showDiscordLink: false,
        showAddFundsHelp: !hasEth,
        walletType: meta.accountType,
        title: "We're having trouble processing transactions",
      });
    }
    const {
      blockchain: { currentAugurTimestamp },
    } = AppStatus.get();
    const timestamp = currentAugurTimestamp * 1000;
    if (
      eventName === TXEventName.Failure ||
      eventName === TXEventName.RelayerDown
    ) {
      const genHash = hash ? hash : generateTxParameterId(transaction.params);
      addAlert({
        id: genHash,
        uniqueId: genHash,
        params: transaction.params,
        status: TXEventName.Failure,
        timestamp,
        name: methodCall,
      });
    } else if (
      hash &&
      eventName === TXEventName.Success &&
      methodCall &&
      methodCall !== '' &&
      methodCall !== CANCELORDER &&
      methodCall !== PUBLICFILLORDER
    ) {
      if (
        methodCall === CREATEMARKET ||
        methodCall === CREATECATEGORICALMARKET ||
        methodCall === CREATEYESNOMARKET ||
        methodCall === CREATESCALARMARKET
      ) {
        updateAlert(hash, {
          params: transaction.params,
          status: TXEventName.Success,
          timestamp,
          name: CREATEMARKET,
        });
      } else {
        updateAlert(hash, {
          params: transaction.params,
          status: TXEventName.Success,
          toast: methodCall === PUBLICFILLORDER,
          timestamp,
          name: methodCall,
        });
      }
    }

    switch (methodCall) {
      case REDEEMSTAKE: {
        const params = transaction.params;
        params._reportingParticipants.map(participant =>
          addPendingData(participant, REDEEMSTAKE, eventName, hash, {
            ...transaction,
          })
        );
        params._disputeWindows.map(window =>
          addPendingData(window, REDEEMSTAKE, eventName, hash, {
            ...transaction,
          })
        );
        updatePendingQueue(REDEEMSTAKE);
        break;
      }
      case CLAIMMARKETSPROCEEDS: {
        const params = transaction.params;
        params._markets.map(market => {
          addPendingData(
            market,
            CLAIMMARKETSPROCEEDS,
            eventName,
            hash,
            { ...transaction }
          );
        })
        updatePendingQueue(CLAIMMARKETSPROCEEDS);
        break;
      }
      case BUYPARTICIPATIONTOKENS: {
        if (eventName === TXEventName.Success) {
          const {
            universe: {
              disputeWindow: { startTime, endTime },
            },
          } = AppStatus.get();
          const genHash = hash
            ? hash
            : generateTxParameterId(transaction.params);
          updateAlert(genHash, {
            id: genHash,
            uniqueId: genHash,
            params: {
              ...transaction.params,
              marketId: 1,
              startTime,
              endTime,
            },
            status: eventName,
            timestamp,
            name: methodCall,
          });
        }

        break;
      }
      case CREATEMARKET:
      case CREATECATEGORICALMARKET:
      case CREATESCALARMARKET:
      case CREATEYESNOMARKET: {
        const id = getDeconstructedMarketId(transaction.params);
        const data = createMarketData(
          transaction.params,
          id,
          hash,
          timestamp,
          methodCall
        );
        // pending queue will be updated when created market event comes in.
        if (eventName !== TXEventName.Success)
          addPendingData(id, CREATE_MARKET, eventName, hash, data);
        if (hash)
          PendingOrders.actions.updateLiquidityHash({
            txParamHash: id,
            txHash: hash,
          });
        if (
          (hash && eventName === TXEventName.Failure) ||
          eventName === TXEventName.RelayerDown
        ) {
          // if tx fails, revert hash to generated tx id, for retry
          PendingOrders.actions.updateLiquidityHash({
            txParamHash: hash,
            txHash: id,
          });
        }
        break;
      }
      case CANCELORDER: {
        const orderId =
          transaction.params && transaction.params.order[TX_ORDER_ID];
        const marketId = parseZeroXMakerAssetData(transaction.params.order.makerAssetData).market;
        addCanceledOrder(orderId, eventName, hash, marketId);
        updatePendingQueue(CANCELORDER, marketId);
        break;
      }
      case BATCHCANCELORDERS: {
        const orders = (transaction.params && transaction.params.orders) || [];
        orders.map(order => {
          const marketId = parseZeroXMakerAssetData(order.makerAssetData).market;
          addCanceledOrder(order.orderId, eventName, hash, marketId)
        });
        updatePendingQueue(CANCELORDER);
        break;
      }
      case CANCELORDERS: {
        const orders = (transaction.params && transaction.params._orders) || [];
        let marketId = '';
        orders.map(order => {
          marketId = parseZeroXMakerAssetData(order.makerAssetData).market;
          addCanceledOrder(order.orderId, eventName, hash, marketId);
          if (eventName === TXEventName.Success) {
            const alert = {
              params: {
                hash,
              },
              status: TXEventName.Success,
              name: CANCELORDERS,
            };

            updateAlert(order.orderId, alert);
          }
        });
        updatePendingQueue(CANCELORDER, marketId);
        break;
      }
      case DOINITIALREPORT: {
        hash && updatePendingReportHash(transaction.params, hash, eventName);
        break;
      }
      case CONTRIBUTE: {
        hash && updatePendingDisputeHash(transaction.params, hash, eventName);
        break;
      }
      case APPROVE: {
        if (eventName === TXEventName.Success) {
          removePendingDataByHash(hash, TRANSACTIONS);
        }
        break;
      }

      default:
        return null;
    }
  }
};

function createMarketData(
  params: TransactionMetadataParams,
  id: string,
  hash: string,
  currentTimestamp: number,
  methodCall: string
): CreateMarketData {
  const extraInfo = JSON.parse(params._extraInfo);
  let data: CreateMarketData = {
    hash,
    pendingId: id,
    description: extraInfo.description,
    pending: true,
    endTime: convertUnixToFormattedDate(params._endTime),
    recentlyTraded: convertUnixToFormattedDate(currentTimestamp),
    creationTime: convertUnixToFormattedDate(currentTimestamp),
    txParams: params,
    marketType: YES_NO,
  };

  if (methodCall === CREATECATEGORICALMARKET) {
    data.marketType = CATEGORICAL;
  } else if (methodCall === CREATESCALARMARKET) {
    data.marketType = SCALAR;
  }
  return data;
}
