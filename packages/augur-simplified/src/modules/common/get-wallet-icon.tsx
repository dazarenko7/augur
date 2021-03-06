import React from 'react';
import {fortmatic, injected, portis, walletconnect, walletlink} from 'modules/ConnectAccount/connectors';
import Identicon from 'modules/ConnectAccount/components/Identicon';
import WalletConnectIcon from 'modules/ConnectAccount/assets/walletConnectIcon.svg';
import CoinbaseWalletIcon from 'modules/ConnectAccount/assets/coinbaseWalletIcon.svg';
import FortmaticIcon from 'modules/ConnectAccount/assets/fortmaticIcon.png';
import PortisIcon from 'modules/ConnectAccount/assets/portisIcon.png';
import Styles from 'modules/common/get-wallet-icon.styles.less';
import {TinyButton} from 'modules/common/buttons';
import {AbstractConnector} from '@web3-react/abstract-connector';

interface GetWalletIconProps {
  account: string;
  connector: AbstractConnector;
  showPortisButton: boolean;
};

export const GetWalletIcon = ({connector, account, showPortisButton}: GetWalletIconProps) => {
  let icon;
  let iconAlt;

  switch (connector) {
    case injected:
      icon = <Identicon account={account} />;
      iconAlt = 'Identicon Image';
      break;
    case walletconnect:
      icon = WalletConnectIcon;
      iconAlt = 'Wallet Connect Logo';
      break;
    case walletlink:
      icon = CoinbaseWalletIcon;
      iconAlt = 'Coinbase Wallet Logo';
      break;
    case fortmatic:
      icon = FortmaticIcon;
      iconAlt = 'Fortmatic Logo';
      break;
    case portis:
      icon = PortisIcon;
      iconAlt = 'Portis Logo';
      break;
    default:
      return null;
  }

  return (
    <div className={Styles.WalletIcon}>
      {connector === injected ? icon : <img src={icon} alt={iconAlt} />}
      {showPortisButton && connector === portis && (
        <TinyButton
          action={() => portis.portis.showPortis()}
          text='Show Portis'
        />
      )}
    </div>
  );
}
