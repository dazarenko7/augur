import { describe, it } from 'mocha';
import { assert } from 'chai';
import proxyquire from 'proxyquire';
import * as selector from '../../../src/modules/transactions/selectors/transactions-totals';
import { PENDING, SUCCESS, FAILED, INTERRUPTED } from '../../../src/modules/transactions/constants/statuses';
import transactionsTotalsAssertions from 'assertions/transactions-totals';

describe(`modules/transactions/selectors/transactions-totals.js`, () => {
	proxyquire.noPreserveCache().noCallThru();
	let actual;
	let expected;

	const selectors = {
		transactions: [{
			id: 'fake',
			status: PENDING
		}, {
			id: 'example',
			status: SUCCESS
		}, {
			id: 'test',
			status: FAILED
		}, {
			id: 'mock',
			status: INTERRUPTED
		}]
	};

	const mockSelector = proxyquire('../../../src/modules/transactions/selectors/transactions-totals', {
		'../../../selectors': selectors
	});


	it(`should return the transaction totals for a blank state`, () => {
		actual = selector.default();
		expected = {
			numWorking: 0,
			numPending: 0,
			numComplete: 0,
			numWorkingAndPending: 0,
			numTotal: 0,
			title: '0 Transactions',
			transactions: undefined,
			shortTitle: '0 Total'
		};
		assert.deepEqual(actual, expected, `Didn't properly handle an empty state`);
	});

	it(`should properly return total info on transactions`, () => {
		actual = mockSelector.default();
		expected = {
			numWorking: 0,
			numPending: 1,
			numComplete: 3,
			numWorkingAndPending: 1,
			numTotal: 4,
			title: 'Transaction Working',
			transactions: undefined,
			shortTitle: '1 Working'
		};
		transactionsTotalsAssertions(actual);
		assert.deepEqual(actual, expected, `Didn't return total info on transactions`);
	});
});
