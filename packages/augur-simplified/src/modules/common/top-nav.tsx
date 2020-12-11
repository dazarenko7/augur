import React from 'react';
import { useLocation } from 'react-router';
import Styles from 'modules/common/top-nav.styles.less';
import { Link } from 'react-router-dom';
import { MARKETS, PORTFOLIO } from 'modules/constants';
import makePath from 'modules/routes/helpers/make-path';
import Logo from 'modules/common/logo';
import parsePath from 'modules/routes/helpers/parse-path';
import classNames from 'classnames';
import { GearIcon } from 'modules/common/icons';

export const TopNav = () => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  return (
    <nav className={classNames(Styles.TopNav, {
      [Styles.TwoTone]: path !== MARKETS,
    })}>
      <section>
        <Logo />
        <ol>
          <li className={classNames({[Styles.Active]: path === MARKETS})}>
            <Link to={makePath(MARKETS)}>Markets</Link>
          </li>
          <li className={classNames({[Styles.Active]: path === PORTFOLIO})}>
            <Link to={makePath(PORTFOLIO)}>Portfolio</Link>
          </li>
        </ol>
      </section>
      <section>
        <button
          title="This doesn't do anything yet!"
          onClick={() => alert('TODO: Make this work.')}
        >
          Connect Account
        </button>
        <button
          title="This doesn't do anything yet!"
          onClick={() => alert('TODO: Make this work.')}
        >
          {GearIcon}
        </button>
      </section>
    </nav>
  );
};

export default TopNav;