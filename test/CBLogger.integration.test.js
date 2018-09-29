'use strict';

const CBLogger = require('./../src/CBLogger');
const CBAlerter = require('@unplgtc/cbalerter');
const util = require('util');

test(`Extend CBLogger with CBAlerter and fire alert`, async() => {
	// Setup
	var mockedSource = 'fileName L1';
	var mockedStack = new Error().stack;
	var mockedSourceStack = {source: mockedSource, stack: mockedStack};

	CBAlerter.alert = jest.fn();
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
	var res = CBLogger.extend(CBAlerter);
	CBLogger.debug(...args);

	// Test
	expect(res).toBe(true);
	expect(console.log).toHaveBeenCalledWith(keyLine, dataLine, sourceLine, tsLine);
	expect(CBAlerter.alert).toHaveBeenCalledWith('DEBUG', ...args, undefined);
});
