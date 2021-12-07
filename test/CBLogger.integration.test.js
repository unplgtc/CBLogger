import CBLogger from './../src/CBLogger.js';
import CBAlerter from '@unplgtc/cbalerter';
import { jest } from '@jest/globals';
import util from 'util';

test(`Extend CBLogger with CBAlerter and fire alert`, async() => {
	// Setup
	var mockedSource = 'fileName L1';
	var mockedStack = new Error().stack;
	var mockedSourceStack = {source: mockedSource, stack: mockedStack};

	CBAlerter.alert = jest.fn(() => Promise.resolve());
	console.log = jest.fn();
	CBLogger.sourceStack = jest.fn(() => mockedSourceStack);

	var mockedDate = new Date();
	global.Date = jest.fn(() => mockedDate);

	var args = ['cbalerter_test', {text: 'Testing CBAlerter'}, {alert: true}];
	var keyLine = `DEBUG: ** ${args[0]}`;
	var dataLine = `${`\n${util.inspect(args[1])}`}`;
	var sourceLine = `\n-> ${mockedSource}`;
	var tsLine = `at ${mockedDate.toISOString().replace('T', ' ')} (${mockedDate.getTime()})`;

	CBAlerter.addWebhook(function(level, key, data, options, err) {
		return {
			url: 'test_url',
			body: {
				key: key,
				data: data
			},
			json: true
		};
	});

	// Execute
	var res = CBLogger.extend(CBLogger.EXTENSION.Alerter, CBAlerter);
	CBLogger.debug(...args);

	// Test
	expect(res).toBe(true);
	expect(console.log).toHaveBeenCalledWith(keyLine, dataLine, sourceLine, tsLine);
	expect(CBAlerter.alert).toHaveBeenCalledWith('DEBUG', ...args, undefined);
});

test(`Failed alert results in error output from CBLogger`, async() => {
	// Setup
	var error = {message: 'Failure'};
	CBAlerter.alert = jest.fn(() => Promise.reject(error));
	CBLogger.error = jest.fn();
	console.error = jest.fn();

	var args = ['test_key', {message: 'testing'}, {alert: true}];

	// Execute
	await CBLogger.debug(...args);

	// Test
	expect(CBAlerter.alert).toHaveBeenCalledWith('DEBUG', ...args, undefined);
	expect(CBLogger.error).toHaveBeenCalledWith('alert_error_response', expect.any(Object), undefined, error);
});
