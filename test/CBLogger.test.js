'use strict';

const CBLogger = require('./../src/CBLogger');
const StandardError = require('@unplgtc/standarderror');
const util = require('util');

// Global Setup
var alerter = {
	alert(key, scope) {
		console.log(`ALERTING ${key} with scope ${scope}`)
	}
}

// Tests
test(`Extend CBLogger with alerter object`, async() => {
	// Setup
	var badAlerter = {
		functionNotNamedAlert(nope) {
			console.error(nope);
		}
	}

	// Execute
	var badRes = CBLogger.extend(badAlerter);
	var goodRes = CBLogger.extend(alerter);

	// Test
	expect(badRes).toBe(StandardError.cblogger_501);
	expect(goodRes).toBe(true);
});

test(`Unextend CBLogger`, async() => {
	// Execute
	var res = CBLogger.unextend();
	var errRes = CBLogger.unextend();

	// Test
	expect(res).toBe(true);
	expect(errRes).toBe(StandardError.cblogger_405);
});

describe.each`
	key                    | data                  | options          | err                   | logFunc    | func
	${'debug_1_simple'}    | ${{text: 'Test 1'}}   | ${undefined}     | ${undefined}          | ${'log'}   | ${'debug'}
	${'debug_2_err'}       | ${{text: 'Test 2'}}   | ${undefined}     | ${StandardError[500]} | ${'log'}   | ${'debug'}
	${'debug_3_stack'}     | ${{text: 'Test 3'}}   | ${{stack: true}} | ${StandardError[500]} | ${'log'}   | ${'debug'}
	${'debug_4_no_ts'}     | ${{text: 'Test 4'}}   | ${{ts: false}}   | ${StandardError[500]} | ${'log'}   | ${'debug'}
	${'info_1_simple'}     | ${{text: 'Test 5'}}   | ${undefined}     | ${undefined}          | ${'log'}   | ${'info'}
	${'info_2_no_data'}    | ${undefined}          | ${undefined}     | ${undefined}          | ${'log'}   | ${'info'}
	${'info_3_nulls'}      | ${null}               | ${null}          | ${null}               | ${'log'}   | ${'info'}
	${'warn_1_simple'}     | ${{text: 'Test 8'}}   | ${undefined}     | ${undefined}          | ${'error'} | ${'warn'}
	${'warn_2_err'}        | ${{text: 'Test 9'}}   | ${undefined}     | ${StandardError[500]} | ${'error'} | ${'warn'}
	${'warn_3_big_data'}   | ${{t:'e',s:'t',n:10}} | ${undefined}     | ${StandardError[500]} | ${'error'} | ${'warn'}
	${'error_1_simple'}    | ${{text: 'Test 11'}}  | ${undefined}     | ${undefined}          | ${'error'} | ${'error'}
	${'error_2_err_txt'}   | ${{text: 'Test 12'}}  | ${undefined}     | ${'Error!'}           | ${'error'} | ${'error'}
	${'error_3_err_obj'}   | ${{text: 'Test 13'}}  | ${undefined}     | ${StandardError[500]} | ${'error'} | ${'error'}
	${'error_4_err_stack'} | ${{text: 'Test 14'}}  | ${{stack: true}} | ${StandardError[500]} | ${'error'} | ${'error'}
`(`CBLogger logs expected output for each logging function based on arguments`, ({key, data, options, err, logFunc, func}) => {
	// Setup
	console.log = jest.fn();
	console.error = jest.fn();
	CBLogger.sourceStack = jest.fn(() => mockedSourceStack);
	var mockedDate = new Date();
	global.Date = jest.fn(() => mockedDate);
	var mockedOpts = options;
	if (!mockedOpts || typeof mockedOpts != 'object') {
		mockedOpts = {};
	}
	var mockedSource = 'fileName L1';
	var mockedStack = new Error().stack;
	var mockedSourceStack = {source: mockedSource, stack: mockedStack};
	var keyLine = `${func.toUpperCase()}: ** ${key}`;
	var dataLine = `${data ? `\n${util.inspect(data)}` : ''}`;
	var errLine = `${err ? `\n** ${(typeof err == 'string' ? err : util.inspect(err))}` : ''}`;
	var sourceLine = `\n-> ${mockedSource}`;
	var tsLine = `${mockedOpts.ts !== 'false' ? `at ${mockedDate.toISOString().replace('T', ' ')} (${mockedDate.getTime()})` : ''}`;
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
		options.scope = func;
		args = [key, data, options, err];
		var errorKeyLine = `ERROR: ** logger_cannot_alert`;
		var errorStackLine = `\n   ${mockedStack}`;
		var errorErrLine = `\n** ${util.inspect(StandardError.cblogger_503)}`;

		// Execute
		CBLogger[func](...args);

		// Test
		expect(console[logFunc]).toHaveBeenCalledWith(...outputArgs);
		expect(console.error).toHaveBeenCalledWith(errorKeyLine, errorErrLine, sourceLine, tsLine, errorStackLine);
	});

	test(`add alerter`, async() => {
		// Execute
		var res = CBLogger.extend(alerter);

		// Test
		expect(res).toBe(true);
	});

	test(`${key} with alert and alerter outputs expected log message + fires alerter`, async() => {
		// Setup
		var alertMessage = `ALERTING ${key} with scope ${func}`;

		// Execute
		CBLogger[func](...args);

		// Test
		expect(console[logFunc]).toHaveBeenCalledWith(...outputArgs);
		expect(console.log).toHaveBeenCalledWith(alertMessage);
	});

	test(`remove alerter`, async() => {
		// Execute
		var res = CBLogger.unextend();

		// Test
		expect(res).toBe(true);
	});	
});