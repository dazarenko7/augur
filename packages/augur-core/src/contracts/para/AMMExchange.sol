pragma solidity 0.5.15;

import 'ROOT/ICash.sol';
import 'ROOT/reporting/IMarket.sol';
import 'ROOT/libraries/token/ERC20.sol';
import 'ROOT/libraries/math/SafeMathInt256.sol';
import 'ROOT/libraries/math/SafeMathUint256.sol';
import 'ROOT/para/ParaShareToken.sol';
import "ROOT/para/interfaces/IAMMFactory.sol";
import "ROOT/para/interfaces/IAMMExchange.sol";
import 'ROOT/libraries/token/SafeERC20.sol';


contract AMMExchange is IAMMExchange, ERC20 {
    using SafeERC20 for IERC20;
    using SafeMathUint256 for uint256;
	using SafeMathInt256 for int256;

    event EnterPosition(address sender, uint256 cash, uint256 outputShares, bool buyYes, uint256 priorShares);
    event ExitPosition(address sender, uint256 invalidShares, uint256 noShares, uint256 yesShares, uint256 cashPayout);
    event AddLiquidity(address sender, uint256 cash, uint256 noShares, uint256 yesShares, uint256 lpTokens);
    event RemoveLiquidity(address sender, uint256 cash, uint256 noShares, uint256 yesShares);
    event SwapPosition(address sender, uint256 inputShares, uint256 outputShares, bool inputYes);

    function initialize(IMarket _market, ParaShareToken _shareToken, uint256 _fee) public {
        require(cash == ICash(0)); // can only initialize once
        require(_fee <= 150); // fee must be [0,150] aka 0-15%

        factory = IAMMFactory(msg.sender);
        cash = _shareToken.cash();
        shareToken = _shareToken;
        augurMarket = _market;
        numTicks = _market.getNumTicks();
        INVALID = _shareToken.getTokenId(_market, 0);
        NO = _shareToken.getTokenId(_market, 1);
        YES = _shareToken.getTokenId(_market, 2);
        fee = _fee;

        // approve cash so sets can be bought
        cash.safeApprove(address(_shareToken.augur()), 2**256-1);
        // approve factory so users can just approve the factory, not each exchange
        shareToken.setApprovalForAll(msg.sender, true);
    }

    // Adds shares to the liquidity pool by minting complete sets.
    function addLiquidity(uint256 _cash, address _recipient) public returns (uint256) {
        (uint256 _poolNo, uint256 _poolYes) = yesNoShareBalances(address(this));
        require(_poolNo != 0, "To add initial liquidity please use addLiquidity");
        uint256 _ratioFactor = 0;
        bool _keepYes = true;
        if (_poolNo > _poolYes) {
            _ratioFactor = _poolYes * 10**18 / _poolNo;
            _keepYes = true;
        } else {
            _ratioFactor = _poolNo * 10**18 / _poolYes;
            _keepYes = false;
        }

        return addLiquidityInternal(msg.sender, _cash, _ratioFactor, _keepYes, _recipient);
    }

    function addInitialLiquidity(uint256 _cash, uint256 _ratioFactor, bool _keepYes, address _recipient) external returns (uint256) {
        (uint256 _poolNo, uint256 _poolYes) = yesNoShareBalances(address(this));
        require(_poolNo == 0, "Cannot add a specified ratio liquidity after initial liquidity has been provided");
        return addLiquidityInternal(msg.sender, _cash, _ratioFactor, _keepYes, _recipient);
    }

    function addLiquidityInternal(address _user, uint256 _cash, uint256 _ratioFactor, bool _keepYes, address _recipient) internal returns (uint256) {
        require(_ratioFactor <= 10**18, "Ratio should be an amount relative to 10**18 (e.g 9 * 10**17 == .9)");
        require(_ratioFactor >= 10**17, "Ratio of 1:10 is the minimum");
        uint256 _setsToBuy = _cash.div(numTicks);
        factory.transferCash(augurMarket, shareToken, fee, _user, address(this), _cash);
        uint256 _yesShares = _setsToBuy;
        uint256 _noShares = _setsToBuy;
        uint256 _yesSharesToUser = 0;
        uint256 _noSharesToUser = 0;

        if (_ratioFactor != 10**18) {
            if (_keepYes) {
                _yesShares = _setsToBuy * _ratioFactor / 10**18;
                _yesSharesToUser = _setsToBuy.sub(_yesShares);
            } else {
                _noShares = _setsToBuy * _ratioFactor / 10**18;
                _noSharesToUser = _setsToBuy.sub(_noShares);
            }
        }

        uint256 _lpTokens = rateAddLiquidity(_yesShares, _noShares);
        shareToken.publicBuyCompleteSets(augurMarket, _setsToBuy);
        if (_ratioFactor != 10**18) {
            shareTransfer(address(this), _recipient, 0, _noSharesToUser, _yesSharesToUser);
        }
        _mint(_recipient, _lpTokens);

        emit AddLiquidity(_user, _cash, _noShares, _yesShares, _lpTokens);

        return _lpTokens;
    }

    // returns how many LP tokens you get for providing the given number of sets
    function rateAddLiquidity(uint256 _yesses, uint256 _nos) public view returns (uint256) {
        uint256 _yesBalance = shareToken.balanceOf(address(this), YES);
        uint256 _noBalance = shareToken.balanceOf(address(this), NO);

        uint256 _priorLiquidityConstant = SafeMathUint256.sqrt(_yesBalance * _noBalance);
        uint256 _newLiquidityConstant = SafeMathUint256.sqrt((_yesBalance + _yesses) * (_noBalance + _nos));

        if (_priorLiquidityConstant == 0) {
            return _newLiquidityConstant;
        } else {
            uint256 _totalSupply = totalSupply;
            return _totalSupply.mul(_newLiquidityConstant).div(_priorLiquidityConstant).sub(_totalSupply);
        }
    }

    // Removes shares from the liquidity pool.
    // If _minSetsSold > 0 then also sell complete sets through burning and through swapping in the pool.
    function removeLiquidity(uint256 _poolTokensToSell, uint256 _minSetsSold) external returns (uint256 _invalidShare, uint256 _noShare, uint256 _yesShare, uint256 _cashShare, uint256 _setsSold){
        (_invalidShare, _noShare, _yesShare, _cashShare, _setsSold) = rateRemoveLiquidity(_poolTokensToSell, _minSetsSold);

        require(_setsSold == 0 || _setsSold >= _minSetsSold, "AugurCP: Would not receive the minimum number of sets");

        _burn(msg.sender, _poolTokensToSell);

        shareTransfer(address(this), msg.sender, _invalidShare, _noShare, _yesShare);
        (uint256 _creatorFee, uint256 _reportingFee) = shareToken.publicSellCompleteSets(augurMarket, _setsSold);
        _cashShare -= _creatorFee + _reportingFee;
        cash.transfer(msg.sender, _cashShare);

        emit RemoveLiquidity(msg.sender, _cashShare, _setsSold, _setsSold);
        // CONSIDER: convert min(poolInvalid, poolYes, poolNo) to DAI by selling complete sets. Selling complete sets incurs Augur fees, maybe we should let the user sell the sets themselves if they want to pay the fee?
    }

    // Tells you how many shares you receive, how much cash you receive, and how many complete sets you burn for cash.
    // Cash share does NOT include market fees from burning complete sets.
    function rateRemoveLiquidity(uint256 _poolTokensToSell, uint256 _minSetsSold) public view returns (uint256 _invalidShare, uint256 _noShare, uint256 _yesShare, uint256 _cashShare, uint256 _setsSold) {
        uint256 _poolSupply = totalSupply;
        (uint256 _poolInvalid, uint256 _poolNo, uint256 _poolYes) = shareBalances(address(this));
        uint256 _poolCash = cash.balanceOf(address(this));

        _invalidShare = _poolInvalid.mul(_poolTokensToSell).div(_poolSupply);
        _noShare = _poolNo.mul(_poolTokensToSell).div(_poolSupply);
        _yesShare = _poolYes.mul(_poolTokensToSell).div(_poolSupply);
        _cashShare = _poolCash.mul(_poolTokensToSell).div(_poolSupply);
        _setsSold = 0;

        if (_minSetsSold > 0) {
            // First, how many complete sets you have
            _setsSold = SafeMathUint256.min(_invalidShare, SafeMathUint256.min(_noShare, _yesShare));
            _invalidShare -= _setsSold;
            _noShare -= _setsSold;
            _yesShare -= _setsSold;
            _cashShare += _setsSold.mul(numTicks);
            // Then, how many you can make from the pool
            // NOTE: This incurs the fee. This is intentional because the LP has a right to a portion of the pool, not a free swap after leaving the pool.
            (uint256 _cashFromExit, uint256 _invalidFromUser, int256 _noFromUser, int256 _yesFromUser) = rateExitPosition(_invalidShare, _noShare, _yesShare);
            _cashShare += _cashFromExit; // extra cash from selling sets to the pool
            _invalidShare -= _invalidFromUser; // minus the invalids spent selling sets to the pool
            if (_noFromUser > 0) {
                _noShare -= uint256(_noFromUser);
            } else { // user gained some No shares when making complete sets
                _noShare += uint256(-_noFromUser);
            }
            if (_yesFromUser > 0) {
                _yesShare -= uint256(_yesFromUser);
            } else { // user gained some No shares when making complete sets
                _yesShare += uint256(-_yesFromUser);
            }
        }
    }

    function enterPosition(uint256 _cashCost, bool _buyYes, uint256 _minShares) public returns (uint256) {
        uint256 _sharesToBuy = rateEnterPosition(_cashCost, _buyYes);

        require(_sharesToBuy >= _minShares, "AugurCP: Too few shares would be received for given cash.");

        factory.transferCash(augurMarket, shareToken, fee, msg.sender, address(this), _cashCost);

        uint256 _setsToBuy = _cashCost.div(numTicks);

        (uint256 _priorNo, uint _priorYes) = yesNoShareBalances(msg.sender);
        uint256  _priorPosition;
        if (_buyYes) {
            _priorPosition = _priorYes;
            shareTransfer(address(this), msg.sender, _setsToBuy, 0, _sharesToBuy);
        } else {
            _priorPosition = _priorNo;
            shareTransfer(address(this), msg.sender, _setsToBuy, _sharesToBuy, 0);
        }

        emit EnterPosition(msg.sender, _cashCost, _sharesToBuy, _buyYes, _priorPosition);

        return _sharesToBuy;
    }

    // Tells you how many shares you get for given cash.
    function rateEnterPosition(uint256 _cashToSpend, bool _buyYes) public view returns (uint256) {
        uint256 _setsToBuy = _cashToSpend.div(numTicks);
        (uint256 _poolInvalid, uint256 _reserveNo, uint256 _reserveYes) = shareBalances(address(this));

        // user buys complete sets
        require(_poolInvalid >= _setsToBuy, "AugurCP: The pool doesn't have enough INVALID tokens to fulfill the request.");
        _reserveNo = _reserveNo.subS(_setsToBuy, "AugurCP: The pool doesn't have enough NO tokens to fulfill the request.");
        _reserveYes = _reserveYes.subS(_setsToBuy, "AugurCP: The pool doesn't have enough YES tokens to fulfill the request.");

        // user swaps away the side they don't want
        if (_buyYes) {
            return applyFee(_setsToBuy.add(calculateSwap(_reserveYes, _reserveNo, _setsToBuy)), fee);
        } else {
            return applyFee(_setsToBuy.add(calculateSwap(_reserveNo, _reserveYes, _setsToBuy)), fee);
        }
    }

    // Exits as much of the position as possible.
	function exitAll(uint256 _minCashPayout) external returns (uint256) {
		(uint256 _userInvalid, uint256 _userNo, uint256 _userYes) = shareBalances(msg.sender);
		return exitPosition(_userInvalid, _userNo, _userYes, _minCashPayout);
	}

    // Sell as many of the given shares as possible, swapping yes<->no as-needed.
    function exitPosition(uint256 _invalidShares, uint256 _noShares, uint256 _yesShares, uint256 _minCashPayout) public returns (uint256) {
        (uint256 _cashPayout, uint256 _invalidFromUser, int256 _noFromUser, int256 _yesFromUser) = rateExitPosition(_invalidShares, _noShares, _yesShares);

        require(_cashPayout >= _minCashPayout, "AugurCP: Proceeds were less than the required payout");
        if (_noFromUser < 0) {
            shareToken.unsafeTransferFrom(address(this), msg.sender, NO, uint256(-_noFromUser));
            _noFromUser = 0;
        }
        if (_yesFromUser < 0) {
            shareToken.unsafeTransferFrom(address(this), msg.sender, YES, uint256(-_yesFromUser));
            _yesFromUser = 0;
        }

        factory.shareTransfer(augurMarket, shareToken, fee, msg.sender, address(this), _invalidFromUser, uint256(_noFromUser), uint256(_yesFromUser));
        cash.transfer(msg.sender, _cashPayout);

        emit ExitPosition(msg.sender, _invalidShares, _noShares, _yesShares, _cashPayout);

        return _cashPayout;
    }

    function rateExitAll() public view returns (uint256 _cashPayout, uint256 _invalidFromUser, int256 _noFromUser, int256 _yesFromUser) {
        (uint256 _userInvalid, uint256 _userNo, uint256 _userYes) = shareBalances(msg.sender);
        return rateExitPosition(_userInvalid, _userNo, _userYes);
    }

    function rateExitPosition(uint256 _invalidShares, uint256 _noSharesToSell, uint256 _yesSharesToSell) public view returns (uint256 _cashPayout, uint256 _invalidFromUser, int256 _noFromUser, int256 _yesFromUser) {
        (uint256 _poolNo, uint256 _poolYes) = yesNoShareBalances(address(this));
        _invalidFromUser = _invalidShares;
        _yesFromUser = int256(_yesSharesToSell);
        _noFromUser = int256(_noSharesToSell);
        uint256 _setsToSell = _invalidShares;

        // Figure out how many shares we're buying in our synthetic swap and use that to figure out the final balance of Yes/No (setsToSell)
        if (_yesSharesToSell > _noSharesToSell) {
            uint256 _delta = _yesSharesToSell.sub(_noSharesToSell);
            uint256 _noSharesToBuy = quadratic(1, -int256(_delta.add(_poolYes).add(_poolNo)), int256(_delta.mul(_poolNo)), _yesSharesToSell);
            _setsToSell = _noSharesToSell.add(_noSharesToBuy);
        } else if (_noSharesToSell > _yesSharesToSell) {
            uint256 _delta = _noSharesToSell.sub(_yesSharesToSell);
            uint256 _yesSharesToBuy = quadratic(1, -int256(_delta.add(_poolYes).add(_poolNo)), int256(_delta.mul(_poolYes)), _noSharesToSell);
            _setsToSell = _yesSharesToSell.add(_yesSharesToBuy);
        }

        if (_invalidShares > _setsToSell) {
            // We have excess Invalid shares that the user will just keep.
            _invalidFromUser = _setsToSell;
        } else {
            // We don't have enough Invalid to actually close out the Yes/No shares. They will be kept by the user.
            // Need to actually receive yes or no shares here since we are swapping to get partial complete sets but dont have enough yes/no to make full complete sets
            if (_yesSharesToSell > _noSharesToSell) {
                uint256 _noSharesToBuy = _setsToSell.sub(_noSharesToSell);
                _noFromUser = _noFromUser.sub(int256(_noSharesToBuy));
                _yesFromUser = int256(_yesSharesToSell.sub(_noSharesToSell.add(_noSharesToBuy).sub(_invalidShares)));
            } else {
                uint256 _yesSharesToBuy = _setsToSell.sub(_yesSharesToSell);
                _yesFromUser = _yesFromUser.sub(int256(_yesSharesToBuy));
                _noFromUser = int256(_noSharesToSell.sub(_yesSharesToSell.add(_yesSharesToBuy).sub(_invalidShares)));
            }
            _setsToSell = _invalidFromUser;
        }

        _cashPayout = applyFee(_setsToSell.mul(numTicks), fee);
    }

    function swap(uint256 _inputShares, bool _inputYes, uint256 _minOutputShares) external returns (uint256) {
        uint256 _outputShares = rateSwap(_inputShares, _inputYes);

        require(_outputShares >= _minOutputShares, "AugurCP: Swap would yield too few output shares.");

        if (_inputYes) { // lose yesses, gain nos
            factory.shareTransfer(augurMarket, shareToken, fee, msg.sender, address(this), uint256(0), uint256(0), _inputShares);
            shareToken.unsafeTransferFrom(address(this), msg.sender, NO, _outputShares);
        } else { // gain yesses, lose nos
            shareToken.unsafeTransferFrom(address(this), msg.sender, YES, _outputShares);
            factory.shareTransfer(augurMarket, shareToken, fee, msg.sender, address(this), uint256(0), _inputShares, uint256(0));
        }

        emit SwapPosition(msg.sender, _inputShares, _outputShares, _inputYes);

        return _outputShares;
    }

    // How many of the other shares you would get for your shares.
    function rateSwap(uint256 _inputShares, bool _inputYes) public view returns (uint256) {
        (uint256 _reserveNo, uint256 _reserveYes) = yesNoShareBalances(address(this));

        if (_inputYes) {
            return applyFee(calculateSwap(_reserveNo, _reserveYes, _inputShares), fee);
        } else {
            return applyFee(calculateSwap(_reserveYes, _reserveNo, _inputShares), fee);
        }
    }

    function shareBalances(address _owner) public view returns (uint256 _invalid, uint256 _no, uint256 _yes) {
        uint256[] memory _tokenIds = new uint256[](3);
        _tokenIds[0] = INVALID;
        _tokenIds[1] = NO;
        _tokenIds[2] = YES;
        address[] memory _owners = new address[](3);
        _owners[0] = _owner;
        _owners[1] = _owner;
        _owners[2] = _owner;
        uint256[] memory _balances = shareToken.balanceOfBatch(_owners, _tokenIds);
        _invalid = _balances[0];
        _no = _balances[1];
        _yes = _balances[2];
        return (_invalid, _no, _yes);
    }

    function yesNoShareBalances(address _owner) public view returns (uint256 _no, uint256 _yes) {
        uint256[] memory _tokenIds = new uint256[](2);
        _tokenIds[0] = NO;
        _tokenIds[1] = YES;
        address[] memory _owners = new address[](2);
        _owners[0] = _owner;
        _owners[1] = _owner;
        uint256[] memory _balances = shareToken.balanceOfBatch(_owners, _tokenIds);
        _no = _balances[0];
        _yes = _balances[1];
        return (_no, _yes);
    }

    function shareTransfer(address _from, address _to, uint256 _invalidAmount, uint256 _noAmount, uint256 _yesAmount) private {
        uint256 _size = (_invalidAmount != 0 ? 1 : 0) + (_noAmount != 0 ? 1 : 0) + (_yesAmount != 0 ? 1 : 0);
        uint256[] memory _tokenIds = new uint256[](_size);
        uint256[] memory _amounts = new uint256[](_size);
        if (_size == 0) {
            return;
        } else if (_size == 1) {
            _tokenIds[0] = _invalidAmount != 0 ? INVALID : _noAmount != 0 ? NO : YES;
            _amounts[0] = _invalidAmount != 0 ? _invalidAmount : _noAmount != 0 ? _noAmount : _yesAmount;
        } else if (_size == 2) {
            _tokenIds[0] = _invalidAmount != 0 ? INVALID : NO;
            _tokenIds[1] = _yesAmount != 0 ? YES : NO;
            _amounts[0] = _invalidAmount != 0 ? _invalidAmount : _noAmount;
            _amounts[1] = _yesAmount != 0 ? _yesAmount : _noAmount;
        } else {
            _tokenIds[0] = INVALID;
            _tokenIds[1] = NO;
            _tokenIds[2] = YES;
            _amounts[0] = _invalidAmount;
            _amounts[1] = _noAmount;
            _amounts[2] = _yesAmount;
        }
        shareToken.unsafeBatchTransferFrom(_from, _to, _tokenIds, _amounts);
    }

    function quadratic(int256 _a, int256 _b, int256 _c, uint256 _maximum) internal pure returns (uint256) {
        int256 _piece = SafeMathInt256.sqrt(_b*_b - (_a.mul(_c).mul(4)));
        int256 _resultPlus = (-_b + _piece) / (2 * _a);
        int256 _resultMinus = (-_b - _piece) / (2 * _a);

        // Choose correct answer based on maximum.
        if (_resultMinus < 0) _resultMinus = -_resultMinus;
        if (_resultPlus < 0) _resultPlus = -_resultPlus;
        if (_resultPlus > int256(_maximum)) {
            return uint256(_resultMinus);
        } else {
            return uint256(_resultPlus);
        }
    }


    // Calculates _deltaA, the number of shares gained from the swap.
    // NOTE: Normally the fee is applied to the input shares. We don't do that here, the fee is later applied to the output shares.
    function calculateSwap(uint256 _reserveA, uint256 _reserveB, uint256 _deltaB) internal pure returns (uint256) {
        uint256 _k = _reserveA.mul(_reserveB);
        return _reserveA.sub(_k.div(_reserveB.add(_deltaB)));
    }

    function applyFee(uint256 _amount, uint256 _fee) internal pure returns (uint256) {
        return _amount.mul(1000 - _fee).div(1000);
    }


    function onTokenTransfer(address _from, address _to, uint256 _value) internal {}
}
