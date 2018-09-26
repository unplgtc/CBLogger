'use strict';

const StandardError = require('@unplgtc/StandardError');
const path = require('path');
const util = require('util');

const CBLogger = {
	debug(key, data, options = {}, err) {
		this.log('DEBUG', key, data, options, err);
	},

	info(key, data, options = {}, err) {
		this.log('INFO', key, data, options, err);
	},

	warn(key, data, options = {}, err) {
		this.log('WARN', key, data, options, err);
	},

	error(key, data, options = {}, err) {
		this.log('ERROR', key, data, options, err);
	},

	extend(object) {
		if (this._extended) {
			return StandardError.cblogger_409;
		}
		return this.extendPrototype(object);		
	}
}

const Internal = {
	log(level, key, data, options, err) {
		var sourceStack = this.sourceStack();
		var ts = new Date();
		var output = [
			`${level}: ** ${key}`,
			`${data ? `\n${util.inspect(data)}` : ''}`,
			`${err ? `\n** ${(typeof err == 'string' ? err : util.inspect(err))}` : ''}`,
			`\n-> ${sourceStack.source}`,
			`${options.ts !== 'false' ? `at ${ts.toISOString().replace('T', ' ')} (${ts.getTime()})` : ''}`,
			`${options.stack ? `\n   ${sourceStack.stack}` : ''}`
		];
		if (['WARN', 'ERROR'].includes(level)) {
			console.error(...output);
		} else {
			console.log(...output);
		}
		if (options.alert) {
			if (this._extended) {
				this.alert(key, options.scope);
			} else {
				this.error('logger_cannot_alert', null, {stack: true}, StandardError.cblogger_503);
			}
		}
	},

	sourceStack() {
		// Pull the stack trace and cut CBLogger lines out of it
		var stack = (new Error().stack).split('\n').slice(4);
		return {source: path.basename(stack[0]).split(':')[0], stack: stack.join('\n').slice(4)};
	},

	extendPrototype(object) {
		if (!object.hasOwnProperty('alert') || typeof object.alert != 'function') {
			return StandardError.cblogger_501;
		}
		this._extended = true;
		// Delegate from Internal to extended object
		Object.setPrototypeOf(Object.getPrototypeOf(this), object);
		return true;
	}
}

StandardError.add([
	{code: 'cblogger_409', domain: 'CBLogger', title: 'Conflict', message: 'Logger has already been extended'},
	{code: 'cblogger_501', domain: 'CBLogger', title: 'Not Implemented', message: 'Alert object passed to `CBLogger.extend` does not implement an `alert` function'},
	{code: 'cblogger_503', domain: 'CBLogger', title: 'Service Unavailable', message: 'CBLogger has not been extended, alert service unavailable'}
]);

Object.setPrototypeOf(CBLogger, Internal);

module.exports = CBLogger;
