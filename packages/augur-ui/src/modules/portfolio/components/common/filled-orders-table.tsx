/* eslint react/no-array-index-key: 0 */

import React from 'react';

import { formatDai, formatEther, formatMarketShares } from 'utils/format-number';
import { MarketData } from 'modules/types';
import {
  LinearPropertyLabel,
  ValueLabel,
} from 'modules/common/labels';
import { ViewTransactionDetailsButton } from 'modules/common/buttons';
import Styles from 'modules/portfolio/components/common/filled-orders-table.styles.less';
import MarketTitle from 'modules/market/components/common/market-title';
import { AppStatus } from 'modules/app/store/app-status';
import { DEFAULT_PARA_TOKEN, WETH } from 'modules/common/constants';

export interface FilledOrdersTableProps {
  filledOrder: MarketData;
  showMarketInfo: boolean;
}

const FilledOrdersTable = (props: FilledOrdersTableProps) => {
  const { paraTokenName } = AppStatus.get();
  const { filledOrder, showMarketInfo } = props;
  return (
    <div className={Styles.FilledOrders}>
      <div>
        {showMarketInfo && (
          <MarketTitle id={filledOrder.marketId} />
        )}
        <ul>
          <li>Filled</li>
          <li>Price</li>
          <li>Time Stamp</li>
          <li>Details</li>
        </ul>
        {filledOrder.trades.map((trade: MarketData, i: number) => (
          <ul key={i}>
            <li>
              <ValueLabel value={formatMarketShares(filledOrder.marketType, trade.amount)} />
            </li>
            <li>
              <ValueLabel value={paraTokenName !== WETH ? formatDai(trade.price) : formatEther(trade.price)} />
            </li>
            <li>{trade.timestamp.formattedLocalShortDateTimeNoTimezone}</li>
            <li>
              <ViewTransactionDetailsButton
                label={'VIEW Etherscan'}
                light
                transactionHash={trade.transactionHash}
              />
            </li>
          </ul>
        ))}
      </div>
      <div>
        {showMarketInfo && (
          <MarketTitle id={filledOrder.marketId} />
        )}
        {filledOrder.trades.map((trade: MarketData, i: number) => (
          <div key={i}>
            <LinearPropertyLabel
              highlightFirst
              label="Filled"
              value={formatMarketShares(filledOrder.marketType, trade.amount).formatted}
            />
            <LinearPropertyLabel
              highlightFirst
              label="Price"
              value={paraTokenName !== WETH ? formatDai(trade.price).formatted : formatEther(trade.price).formatted}
            />
            <LinearPropertyLabel
              highlightFirst
              label="Timestamp"
              value={trade.timestamp.formattedLocalShortDateTimeNoTimezone}
            />
            <ViewTransactionDetailsButton
              light
              label='View Transaction Details'
              transactionHash={trade.transactionHash}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilledOrdersTable;
