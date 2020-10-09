import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { TransactionResponse } from '@ethersproject/abstract-provider';

import { binarySearch, bnDirection } from '@augurproject/utils';
import { AMMExchangeAbi } from '../abi/AMMExchangeAbi';
import { NULL_ADDRESS, SignerOrProvider, YES_NO_NUMTICKS } from '../constants';

export class AMMExchange {
  readonly contract: ethers.Contract;
  readonly address: string;

  constructor(signerOrProvider: SignerOrProvider, address: string) {
    this.contract = new ethers.Contract(address, AMMExchangeAbi, signerOrProvider);
    this.address = address;
  }

  // Ratio of Yes:No shares.
  async price(): Promise<BigNumber> {
    const { _no, _yes } = this.contract.yesNoShareBalances(this.contract.address);
    return _yes.div(_no);
  }

  async enterPosition(shares: Shares, yes: boolean, rate = false): Promise<BigNumber> {
    const cash = await binarySearch(
      new BigNumber(1),
      new BigNumber(shares.times(YES_NO_NUMTICKS)),
      100,
      async (cash) => {
        const yesShares = await this.contract.rateEnterPosition(cash.toFixed(), yes);
        return bnDirection(shares, yesShares);
      }
    );
    if (!rate) {
      const txr: TransactionResponse = await this.contract.enterPosition(cash.toFixed(), yes, shares.toFixed());
      const tx = await txr.wait();
      const logs = tx.logs
        .filter((log) => log.address === this.address)
        .map((log) =>  this.contract.interface.parseLog(log));
      console.log(JSON.stringify(logs, null, 2));
    }
    return cash;
  }

  async exitPosition(invalidShares: Shares, noShares: Shares, yesShares: Shares) {
    const { _cashPayout } = await this.contract.rateExitPosition(invalidShares, noShares, yesShares);
    await this.contract.exitPosition(invalidShares, noShares, yesShares, _cashPayout);
  }

  async exitAll(): Promise<Cash> {
    const { _cashPayout } = await this.contract.rateExitAll();
    await this.contract.exitAll(_cashPayout);
    return _cashPayout;
  }

  async swapForYes(noShares: Shares): Promise<Shares> {
    return this.swap(noShares, false);
  }

  async swapForNo(yesShares: Shares): Promise<Shares> {
    return this.swap(yesShares, true);
  }

  async swap(inputShares: Shares, inputYes: boolean): Promise<Shares> {
    const noShares = await this.contract.rateSwap(inputShares, inputYes);
    await this.contract.swap(inputShares, inputYes, noShares);
    return noShares;
  }

  async addLiquidity(yesShares: Shares, noShares: Shares = null): Promise<LPTokens> {
    if (noShares === null || yesShares.eq(noShares)) { // buy into liquidity at 1:1 ratio
      const sets = yesShares;
      const txr: TransactionResponse = await this.contract.addLiquidity(sets.toFixed());
      const tx = await txr.wait();
      const logs = tx.logs
        .filter((log) => log.address === this.address)
        .map((log) =>  this.contract.interface.parseLog(log));
      console.log(JSON.stringify(logs, null, 2));

      return new BigNumber(1337);
    }

    const swapForYes = yesShares.gt(noShares);
    const minBuy = BigNumber.min(noShares, yesShares);
    const maxBuy = BigNumber.max(noShares, yesShares);

    const setsBought = await binarySearch(
      minBuy,
      maxBuy,
      100,
      async (setsToBuy) => {
        const setsToSell = setsToBuy.minus(minBuy);
        const {_yesses, _nos} = await this.contract.sharesRateForAddLiquidityThenSwap(setsToBuy, swapForYes, setsToSell);
        return swapForYes ? bnDirection(yesShares, _yesses) : bnDirection(noShares, _nos);
      }
    );

    const setsSwapped = setsBought.minus(minBuy);

    const lpTokens = await this.contract.rateAddLiquidityThenSwap(setsBought, swapForYes, setsSwapped);
    await this.contract.addLiquidityThenSwap(setsBought, swapForYes, setsSwapped);
    return lpTokens;
  }


  async rateAddLiquidity(yesShares: Shares, noShares: Shares = null): Promise<LPTokens> {
    noShares = noShares || yesShares;
    return this.contract.rateAddLiquidity(yesShares.toFixed(), noShares.toFixed());
  }


  async removeLiquidity(lpTokens: LPTokens, alsoSell = false): Promise<RemoveLiquidityReturn> {
    // if not selling them minSetsSold is 0
    // if selling them calculate how many sets you could get, then sell that many

    let minSetsSold: Sets;
    if (alsoSell) {
      // Selling more than zero sets sells as many sets as possible. So one atto set is enough to get the rate.
      const { _setsSold } = await this.contract.rateRemoveLiquidity(lpTokens, new BigNumber(1));
      minSetsSold = _setsSold;
    } else {
      minSetsSold = new BigNumber(0);
    }

    const removedLiquidity = await this.contract.rateRemoveLiquidity(lpTokens, minSetsSold);
    await this.contract.removeLiquidity(lpTokens, minSetsSold);
    return removedLiquidity;
  }

  calculateCashForSharesInSwap(desiredShares: Shares, yes: boolean): BigNumber {
    // X**2 - (PN + PY)X + (2PN(PY) - PN(Y))
    // Where X = cash required; Y = desired Shares, PN = pool No, PY = pool Yes
    const a = new BigNumber(1);
    const { _no, _yes } = this.contract.yesNoShareBalances(this.contract.address);
    const b = new BigNumber(_yes).plus(_no);
    const c = new BigNumber(2).multipliedBy(_no).multipliedBy(_yes).minus(desiredShares.multipliedBy(yes ? _no : _yes));
    return this.solveQuadratic(a, b, c);
  }

  solveQuadratic(a: BigNumber, b: BigNumber, c: BigNumber): BigNumber {
    const piece =  (b.multipliedBy(b).minus(a.multipliedBy(c).multipliedBy(4))).abs().sqrt();
    let resultPlus = b.multipliedBy(-1).plus(piece).dividedBy(a.multipliedBy(2));
    let resultMinus = b.multipliedBy(-1).plus(piece).dividedBy(a.multipliedBy(2));

    // Choose correct answer.
    if (resultPlus.lt(0)) {
      return resultMinus;
    } else if (resultMinus.lt(0)) {
      return resultPlus;
    } else if (resultPlus.lt(resultMinus)) {
      return resultPlus;
    } else {
      return resultMinus;
    }
  }
  
  async totalLiquidity(): Promise<LPTokens> {
    const lpTokens = await this.contract.totalSupply()
    return new BigNumber(lpTokens.toString());
  }
}

export interface RemoveLiquidityReturn {
  _invalidShare: Shares,
  _noShare: Shares,
  _yesShare: Shares,
  _setsSold: Sets,
}

export type LPTokens = BigNumber;
export type Shares = BigNumber;
export type Sets = BigNumber;
export type Cash = BigNumber;
