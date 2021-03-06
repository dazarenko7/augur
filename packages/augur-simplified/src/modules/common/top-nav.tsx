import React, {useEffect, useState, useMemo, Fragment, useRef} from 'react';
import { useLocation } from 'react-router';
import Styles from 'modules/common/top-nav.styles.less';
import ButtonStyles from 'modules/common/buttons.styles.less'
import { Link } from 'react-router-dom';
import { MARKETS, PORTFOLIO, SIDEBAR_TYPES } from 'modules/constants';
import makePath from 'modules/routes/helpers/make-path';
import Logo from 'modules/common/logo';
import parsePath from 'modules/routes/helpers/parse-path';
import classNames from 'classnames';
import { GearIcon, ThreeLinesIcon } from 'modules/common/icons';
import { useAppStatusStore } from 'modules/stores/app-status';
import { useLocalStorage } from 'modules/stores/local-storage';
import ConnectAccount from 'modules/ConnectAccount/index';
import { SecondaryButton, TinyButton } from 'modules/common/buttons';
import { Toasts } from '../toasts/toasts';

export const SettingsButton = () => {
  const {
    settings: { slippage },
    actions: { updateSettings },
  } = useAppStatusStore();
  const [open, setOpened] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const settingsRef = useRef(null);
  const isSelectedArray = useMemo(() => {
    let output = [false, false, false, false];
    switch (slippage) {
      case '0.1': {
        output[0] = true;
        break;
      }
      case '0.5': {
        output[1] = true;
        break;
      }
      case '1': {
        output[2] = true;
        break;
      }
      default: {
        output[3] = true;
        break;
      }
    }
    return output;
  }, [slippage]);

  useEffect(() => {
    const handleWindowOnClick = (event) => {
      if (open && !!(event.target) && settingsRef.current !== null && !settingsRef?.current?.contains(event.target)) {
        setOpened(false);
      }
    };

    window.addEventListener('click', handleWindowOnClick);

    return () => {
      window.removeEventListener('click', handleWindowOnClick);
    }
  });

  return (
    <Fragment key="settingsButton">
      <SecondaryButton action={() => setOpened(!open)} icon={GearIcon} />
      {open && (
        <ul className={Styles.SettingsMenu} ref={settingsRef}>
          <li>
            <h2>Settings</h2>
          </li>
          <li>
            <label>Slippage Tolerance</label>
            <ul>
              <li>
                <TinyButton
                  text="0.1%"
                  action={() => updateSettings({ slippage: '0.1' })}
                  selected={isSelectedArray[0]}
                  className={ButtonStyles.TinyTransparentButton}
                />
              </li>
              <li>
                <TinyButton
                  text="0.5%"
                  action={() => updateSettings({ slippage: '0.5' })}
                  selected={isSelectedArray[1]}
                  className={ButtonStyles.TinyTransparentButton}
                />
              </li>
              <li>
                <TinyButton
                  text="1%"
                  action={() => updateSettings({ slippage: '1' })}
                  selected={isSelectedArray[2]}
                  className={ButtonStyles.TinyTransparentButton}
                />
              </li>
              <li>
                <div className={classNames({
                  [Styles.Selected]: isSelectedArray[3],
                })}>
                  <input
                    type="number"
                    step="0.1"
                    value={customVal}
                    onChange={(v) => {
                      setCustomVal(v.target.value);
                    }}
                    onBlur={() => {
                      if (customVal !== slippage) {
                        if (
                          customVal === '' ||
                          isNaN(Number(customVal)) ||
                          Number(customVal) > 100 ||
                          Number(customVal) <= 0
                        ) {
                          setCustomVal(slippage);
                        } else {
                          updateSettings({ slippage: customVal });
                        }
                      }
                    }}
                    placeholder={slippage}
                    max="100"
                    min="0.1"
                  />
                  <span>%</span>
                </div>
              </li>
            </ul>
          </li>
        </ul>
      )}
    </Fragment>
  );
};

export const TopNav = () => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const {
    paraConfig: { networkId },
    loginAccount,
    transactions,
    isMobile,
    actions: { setSidebar, updateLoginAccount, logout, addTransaction },
  } = useAppStatusStore();
  const [user, setUser] = useLocalStorage('user', null);

  useEffect(() => {
    if (
      loginAccount?.library?.provider?.isMetaMask &&
      user?.account !== loginAccount?.account &&
      loginAccount?.account
    ) {
      setUser({ account: loginAccount.account });
    } else if (!loginAccount?.active && !!user?.account) {
      setUser({});
    }
  }, [loginAccount, user, setUser]);

  const autoLogin = user?.account || null;

  const handleAccountUpdate = (activeWeb3) => {
    if (activeWeb3) {
      const savedTransactions = JSON.parse(window.localStorage.getItem('transactions')) || [];

      if (transactions && transactions.length === 0 && savedTransactions && savedTransactions.length > 0) {
        savedTransactions.map(tx => addTransaction(tx));
      }

      if (String(networkId) !== String(activeWeb3.chainId)) {
        updateLoginAccount({ chainId: activeWeb3.chainId });
      } else if (loginAccount && loginAccount.account) {
        if (loginAccount.account !== activeWeb3.account) {
          // Cleanup old user state
          logout();
          window.localStorage.setItem('transactions', JSON.stringify([]));

          updateLoginAccount(activeWeb3);
        }
      } else {
        updateLoginAccount(activeWeb3);
      }
    }
  };

  return (
    <nav
      className={classNames(Styles.TopNav, {
        [Styles.TwoTone]: path !== MARKETS,
      })}
    >
      <section>
        <Logo />
        {!isMobile && (
          <ol>
            <li className={classNames({ [Styles.Active]: path === MARKETS })}>
              <Link to={makePath(MARKETS)}>Markets</Link>
            </li>
            <li className={classNames({ [Styles.Active]: path === PORTFOLIO })}>
              <Link to={makePath(PORTFOLIO)}>Portfolio</Link>
            </li>
          </ol>
        )}
      </section>
      <section>
        <ConnectAccount
          updateLoginAccount={handleAccountUpdate}
          autoLogin={autoLogin}
          transactions={transactions}
        />
        {isMobile ? (
          <button
            className={Styles.MobileMenuButton}
            title="Augur Menu"
            onClick={() => setSidebar(SIDEBAR_TYPES.NAVIGATION)}
          >
            {ThreeLinesIcon}
          </button>
        ) : (
          <SettingsButton />
        )}
        <Toasts />
      </section>
    </nav>
  );
};

export default TopNav;
