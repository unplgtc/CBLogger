import CBAlerter from '@unplgtc/cbalerter';
import CBLogger from './../src/CBLogger.js';
import { jest } from '@jest/globals';
import util from 'util';

import Errors from '@unplgtc/standard-error';
const { HttpError } = Errors;
const {
	MethodNotAllowedError,
	AlreadyExtendedError,
	InvalidExtensionError,
	AlertingUnavailableError
} = Errors.CBLogger;

// Global Setup
const alerter = {
	alert(level, key, data, options, err) {
		console.log(`ALERTING ${key} with scope ${level}`);
		return Promise.resolve('Success');
	}
}
const http500Error = new HttpError(500);

// Tests
test(`Extend CBLogger with alerter object`, async() => {
	// Setup
	const badAlerter = {
		functionNotNamedAlert() {
			console.error('Nope!');
		}
	}

	// Execute
	let badResErr, goodResErr;
	try {
		CBLogger.extend(CBLogger.EXTENSION.Alerter, badAlerter);

	} catch (err) {
		badResErr = err;
	}
	try {
		CBLogger.extend(CBLogger.EXTENSION.Alerter, alerter);

	} catch (err) {
		goodResErr = err;
	}

	// Test
	expect(badResErr instanceof InvalidExtensionError).toBe(true);
	expect(goodResErr).toBe(undefined);
});

test(`Unextend CBLogger`, async() => {
	// Execute
	let res, errRes;
	try {
		res = CBLogger.unextendAlerter();
		CBLogger.unextendAlerter();

	} catch(err) {
		errRes = err;
	}

	// Test
	expect(res).toBe(true);
	expect(errRes instanceof MethodNotAllowedError).toBe(true);
});

describe.each`
	key                    | data                  | options          | err             | logFunc    | func
	${'debug_1_simple'}    | ${{text: 'Test 1'}}   | ${undefined}     | ${undefined}    | ${'log'}   | ${'debug'}
	${'debug_2_err'}       | ${{text: 'Test 2'}}   | ${undefined}     | ${http500Error} | ${'log'}   | ${'debug'}
	${'debug_3_stack'}     | ${{text: 'Test 3'}}   | ${{stack: true}} | ${http500Error} | ${'log'}   | ${'debug'}
	${'debug_4_no_ts'}     | ${{text: 'Test 4'}}   | ${{ts: false}}   | ${http500Error} | ${'log'}   | ${'debug'}
	${'info_1_simple'}     | ${{text: 'Test 5'}}   | ${undefined}     | ${undefined}    | ${'log'}   | ${'info'}
	${'info_2_no_data'}    | ${undefined}          | ${undefined}     | ${undefined}    | ${'log'}   | ${'info'}
	${'info_3_nulls'}      | ${null}               | ${null}          | ${null}         | ${'log'}   | ${'info'}
	${'warn_1_simple'}     | ${{text: 'Test 8'}}   | ${undefined}     | ${undefined}    | ${'error'} | ${'warn'}
	${'warn_2_err'}        | ${{text: 'Test 9'}}   | ${undefined}     | ${http500Error} | ${'error'} | ${'warn'}
	${'warn_3_big_data'}   | ${{t:'e',s:'t',n:10}} | ${undefined}     | ${http500Error} | ${'error'} | ${'warn'}
	${'error_1_simple'}    | ${{text: 'Test 11'}}  | ${undefined}     | ${undefined}    | ${'error'} | ${'error'}
	${'error_2_err_txt'}   | ${{text: 'Test 12'}}  | ${undefined}     | ${'Error!'}     | ${'error'} | ${'error'}
	${'error_3_err_obj'}   | ${{text: 'Test 13'}}  | ${undefined}     | ${http500Error} | ${'error'} | ${'error'}
	${'error_4_err_stack'} | ${{text: 'Test 14'}}  | ${{stack: true}} | ${http500Error} | ${'error'} | ${'error'}
`(`CBLogger logs expected output for each logging function based on arguments`, ({key, data, options, err, logFunc, func}) => {
	// Setup
	var mockedSource = 'fileName L1';
	var mockedStack = new Error().stack;
	var mockedSourceStack = {source: mockedSource, stack: mockedStack};

	console.log = jest.fn();
	console.error = jest.fn();
	CBLogger.sourceStack = jest.fn(() => mockedSourceStack);

	var mockedDate = new Date();
	global.Date = jest.fn(() => mockedDate);

	var mockedOpts = options;
	if (!mockedOpts || typeof mockedOpts != 'object') {
		mockedOpts = {};
	}
	var keyLine = `${func.toUpperCase()}: ** ${key}`;
	var dataLine = `${data ? `\n${util.inspect(data)}` : ''}`;
	var errLine = `${err ? `\n** ${(typeof err == 'string' ? err : util.inspect(err))}` : ''}`;
	var sourceLine = `\n-> ${mockedSource}`;
	var tsLine = `${mockedOpts.ts !== false ? `at ${mockedDate.toISOString().replace('T', ' ')} (${mockedDate.getTime()})` : ''}`;
	var stackLine = `${mockedOpts.stack ? `\n   ${mockedStack}` : ''}`;

	var args = [key, data, options, err];
	var outputArgs = [keyLine, dataLine, errLine, sourceLine, tsLine, stackLine].filter(arg => arg);

	// Test Cases
	test(`${key}`, async() => {
		// Execute
		CBLogger[func](...args);

		// Test
		expect(console[logFunc]).toHaveBeenCalledWith(...outputArgs);
	});

	test(`${key} with alert, sans alerter outputs expected log message + alert error`, async() => {
		// Setup
		if (!options || typeof options != 'object') {
			options = {};
		}
		options.alert = true;
		args = [key, data, options, err];

		// Execute
		CBLogger[func](...args);

		// Test
		expect(console[logFunc]).toHaveBeenCalledWith(...outputArgs);
		expect(console.error).toHaveBeenCalled();
	});

	test(`add alerter`, async() => {
		// Execute
		var res = CBLogger.extend(CBLogger.EXTENSION.Alerter, alerter);

		// Test
		expect(res).toBe(true);
	});

	test(`${key} with alert and alerter outputs expected log message + fires alerter`, async() => {
		// Setup
		var alertMessage = `ALERTING ${key} with scope ${func.toUpperCase()}`;

		// Execute
		CBLogger[func](...args);

		// Test
		expect(console[logFunc]).toHaveBeenCalledWith(...outputArgs);
		expect(console.log).toHaveBeenCalledWith(alertMessage);
	});

	test(`remove alerter`, async() => {
		// Execute
		var res = CBLogger.unextendAlerter();

		// Test
		expect(res).toBe(true);
	});
});

test(`CBLogger extended with invalid alerter (wrong number of accepted arguments) outputs error when called`, async() => {
	CBLogger.error = jest.fn();

	// Setup
	var subtleBadAlerter = {
		alert() {
			console.error('Not enough arguments!');
		}
	}

	// Execute
	var extendRes = CBLogger.extend(CBLogger.EXTENSION.Alerter, subtleBadAlerter);
	await CBLogger.info('test', {message: 'some_message'}, {alert: true});
	CBLogger.unextendAlerter();

	// Test
	expect(extendRes).toBe(true);
	expect(CBLogger.error).toHaveBeenCalledWith('alert_error_thrown', expect.any(Object), undefined, expect.any(Object));
});

test(`CBLogger extended with invalid alerter (doesn't return promise) outputs error when called`, async() => {
	CBLogger.error = jest.fn();

	// Setup
	var subtleBadAlerter = {
		alert(level, key, data, options, err) {
			return 'Not a promise!';
		}
	}

	// Execute
	var extendRes = CBLogger.extend(CBLogger.EXTENSION.Alerter, subtleBadAlerter);
	await CBLogger.info('test', {message: 'some_message'}, {alert: true});
	CBLogger.unextendAlerter();

	// Test
	expect(extendRes).toBe(true);
	expect(CBLogger.error).toHaveBeenCalledWith('alert_error_thrown', expect.any(Object), undefined, expect.any(Object));
});
