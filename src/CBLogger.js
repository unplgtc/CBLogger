'use strict';

const _ = require('@unplgtc/standard-promise');
const StandardError = require('@unplgtc/standard-error');
const path = require('path');
const util = require('util');

const CBLogger = {
	debug(key, data, options, err) {
		return this.log('DEBUG', key, data, options, err);
	},

	info(key, data, options, err) {
		return this.log('INFO', key, data, options, err);
	},

	warn(key, data, options, err) {
		return this.log('WARN', key, data, options, err);
	},

	error(key, data, options, err) {
		return this.log('ERROR', key, data, options, err);
	},

	extend(object) {
		if (this._extended) {
			return StandardError.CBLogger_409;
		}
		return this.extendPrototype(object);		
	},

	unextend() {
		if (!this._extended) {
			return StandardError.CBLogger_405;
		}
		return this.unextendPrototype();
	}
}

const Internal = {
	log: async function(level, key, data, options, err) {
		if (!options || typeof options != 'object') {
			options = {};
		}
		var sourceStack = this.sourceStack();
		var ts = new Date();
		var output = [
			`${level}: ** ${key}`,
			`${data ? `\n${util.inspect(data)}` : ''}`,
			`${err ? `\n** ${(typeof err == 'string' ? err : util.inspect(err))}` : ''}`,
			`\n-> ${sourceStack.source}`,
			`${options.ts !== false ? `at ${ts.toISOString().replace('T', ' ')} (${ts.getTime()})` : ''}`,
			`${options.stack ? `\n   ${sourceStack.stack}` : ''}`
		].filter(line => line);
		if (['WARN', 'ERROR'].includes(level)) {
			console.error(...output);
		} else {
			console.log(...output);
		}
		if (options.alert) {
			if (this._extended) {
				var alertRes = await _(this.alert(level, key, data, options, err));
				if (alertRes.err) {
					if (alertRes.err.code && alertRes.err.code == 'StandardPromise_500') {
						this.error('alert_exception', {message: 'Exception thrown awaiting alert response. Make sure the alert() function that CBLogger was extended with takes five arguments and returns a promise.'}, undefined, alertRes.err);
					} else {
						this.error('alert_error_response', {message: 'Received error response from extended alerter'}, undefined, alertRes.err);
					}
				}
			} else {
				this.error('logger_cannot_alert', null, {stack: true}, StandardError.CBLogger_503);
			}
		}
	},

	sourceStack() {
		// Pull the stack trace and cut CBLogger lines out of it
		var stack = (new Error().stack).split('\n').slice(4);
		var source = path.basename(stack[0]).split(':');
		return {source: `${source[0]} L${source[1]}`, stack: stack.join('\n').slice(4)};
	},

	extendPrototype(object) {
		if (!object.hasOwnProperty('alert') || typeof object.alert != 'function') {
			return StandardError.CBLogger_501;
		}
		this._extended = true;
		// Delegate from Internal to extended object
		Object.setPrototypeOf(Object.getPrototypeOf(this), object);
		return true;
	},

	unextendPrototype() {
		this._extended = false;
		// Delegate from Internal to extended object
		Object.setPrototypeOf(Object.getPrototypeOf(this), Object.prototype);
		return true;
	}
}

StandardError.add([
	{code: 'CBLogger_405', domain: 'CBLogger', title: 'Method Not Allowed', message: 'Cannot unextend because CBLogger is not currently extended'},
	{code: 'CBLogger_409', domain: 'CBLogger', title: 'Conflict', message: 'Logger has already been extended'},
	{code: 'CBLogger_501', domain: 'CBLogger', title: 'Not Implemented', message: 'Alert object passed to `CBLogger.extend` does not implement an `alert` function'},
	{code: 'CBLogger_503', domain: 'CBLogger', title: 'Service Unavailable', message: 'CBLogger has not been extended, alert service unavailable'}
]);

Object.setPrototypeOf(CBLogger, Internal);

module.exports = CBLogger;
