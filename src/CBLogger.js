import { createErrors } from '@unplgtc/standard-error';
import path from 'path';
import util from 'util';

const [
	MethodNotAllowedError,
	AlreadyExtendedError,
	InvalidExtensionError,
	AlertingUnavailableError
] = createErrors([
	{
		name: 'MethodNotAllowedError',
		message: 'Cannot unextend because CBLogger is not currently extended with that object type'
	},
	{
		name: 'AlreadyExtendedError',
		message: 'CBLogger has already been extended with this extension type. Only one extension of each type is allowed'
	},
	{
		name: 'InvalidExtensionError',
		message: 'Object passed to `CBLogger.extend()` does not implement required function'
	},
	{
		name: 'AlertingUnavailableError',
		message: 'CBLogger has not been extended with an alerter, so the alert functionality is not available'
	}
]);

let rTracer;
try { rTracer = await import('cls-rtracer'); } catch (err) {}

const CBLogger = {
	EXTENSION: {
		Alerter: '_alerter',
		Honeybadger: '_honeybadger'
	},

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

	extend(type, object) {
		if (this[type]) {
			throw new AlreadyExtendedError();
		}
		return this.extendLogger(type, object);
	},

	unextendAlerter() {
		if (!this[this.EXTENSION.Alerter]) {
			throw new MethodNotAllowedError();
		}
		return this.unextendPrototype();
	}
}

const Internal = {
	log: async function(level, key, data, options, err) {
		if (!err) {
			if (data instanceof Error) {
				err = data;
				data = undefined;
			}
			if (options instanceof Error) {
				err = options;
				options = undefined;
			}
		}

		if (!options || typeof options != 'object') {
			options = {};
		}

		let reqId;
		if (rTracer) {
			reqId = rTracer.id();
		}

		if (reqId && !data) {
			data = { _requestId: reqId };

		} else if (reqId && typeof data == 'object') {
			data._requestId = reqId;
		}

		const sourceStack = this.sourceStack(),
		      ts = new Date();

		const output = [
			`${level}: ** ${key}`,
			`${data ? `\n${util.inspect(data, { depth: (options.depth !== undefined ? options.depth : 4) })}` : ''}`,
			`${err ? `\n** ${(typeof err == 'string' ? err : util.inspect(err))}` : ''}`,
			`\n-> ${sourceStack.source}`,
			`${options.ts !== false ? `at ${ts.toISOString().replace('T', ' ')} (${ts.getTime()})` : ''}`,
			`${options.stack ? `\n   ${sourceStack.stack}` : ''}`
		].filter(line => line);

		if (['WARN', 'ERROR'].includes(level)) {
			console.error(...output);

			if (level === 'ERROR' && err) {
				this.Honeybadger && this.Honeybadger.notify(err, {
					name: key,
					context: data
				});
			}

		} else {
			console.log(...output);
		}

		if (options.alert) {
			if (this[this.EXTENSION.Alerter]) {
				try {
					await this.alert(level, key, data, options, err)
						.catch((err) => {
							this.error('alert_error_response', {message: 'Received error response from extended alerter'}, undefined, err);
						});
				} catch (err) {
					this.error('alert_error_thrown', {message: 'Error thrown attempting to await alert function - make sure alerter takes correct arguments and returns a Promise'}, undefined, err);
				}
			} else {
				this.error('logger_cannot_alert', null, {stack: true}, new AlertingUnavailableError());
			}
		}
	},

	sourceStack() {
		// Pull the stack trace and cut CBLogger lines out of it
		var stack = (new Error().stack).split('\n').slice(4);
		var source = stack[0].split('/').slice(-2);
		var line = source[1].split(':')[1];
		source = source.join('/').split(':')[0];
		return {source: `${source} L${line}`, stack: stack.join('\n').slice(4)};
	},

	extendLogger(type, object) {
		if (type === this.EXTENSION.Alerter) {
			if (!object.hasOwnProperty('alert') || typeof object.alert !== 'function') {
				throw new InvalidExtensionError();
			}

			this[this.EXTENSION.Alerter] = true;

			// Delegate from Internal to extended object
			Object.setPrototypeOf(Object.getPrototypeOf(this), object);
			return true;

		} else if (type === this.EXTENSION.Honeybadger) {
			if (typeof object.notify !== 'function') {
				throw new InvalidExtensionError();
			}

			Object.defineProperty(this, type, {
				value: true,
				writable: false,
				configurable: false,
				enumerable: false
			});
			Object.defineProperty(this, 'Honeybadger', {
				value: object,
				writable: false,
				configurable: false,
				enumerable: false
			});

			return true;

		} else {
			return false;
		}
	},

	unextendPrototype() {
		this[this.EXTENSION.Alerter] = false;
		// Rewrite the delegation tree to point directly to the standard Object prototype again
		Object.setPrototypeOf(Object.getPrototypeOf(this), Object.prototype);
		return true;
	}
}

Object.setPrototypeOf(CBLogger, Internal);

export default CBLogger;
