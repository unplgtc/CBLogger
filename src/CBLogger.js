'use strict';

const CBAlerter = {
	alert(alert, scope) {
		if (this.alertWebhook) {
			this.alertWebhook.sendWebhook({
				'text': '',
				'attachments': [
					{
						'fallback': alert,
						'color': '#EA4857',
						'pretext': scope ? `<!${scope}>` : '',
						'text': alert
					}
				],
				"channel": process.env.alertChannel
			}, function(err, res) {
				if (err) {
					console.error('** ERROR: Failed to send Slack alert:', err);
				} else {
					console.log(`** info: Delivered Slack alert: ${alert}`);
				}
			});
		} else {
			console.error('** ERROR: Failed to send Slack alert, alert webhook not configured for CBAlerter');
		}
	}
}

const CBLogger = {
	info(text, data, alert, scope) {
		if (data) {
			if (data.source) {
			    data.source = data.source.split('/').pop();
			}
			console.log(`info: ** ${text}\n->`, data);
		} else {
			console.log(`info: ** ${text}`);
		}
		if (alert) {
			this.alert(text, scope);
		}
	},
	warn(text, data, alert, scope) {
		if (data) {
			if (data.source) {
			    data.source = data.source.split('/').pop();
			}
			console.error(`WARN: ** ${text}\n->`, data);
		} else {
			console.error(`WARN: ** ${text}`);
		}
		if (alert) {
			this.alert(text, scope);
		}
	},
	error(text, data, err, alert, scope) {
		// Pull the stack trace and cut CBLogger out of it
		var stack = new Error().stack;
		stack = stack.split('\n').slice(2).join('\n').slice(3);

		// If CBLogger was passed a StandardError object, move the object to the err param and set its message as the text
		if (typeof text == "object" && text.message) {
			err = text;
			text = text.message;
		}

		// If source data was passed in, split to only show the file name
		if (data && data.source) {
			data.source = data.source.split('/').pop();
		}

		// Print the error
		if (err && data) {
			console.error(`ERROR: ** ${text}\n->`, data, '\n!!', err);
		} else if (err) {
			console.error(`ERROR: ** ${text}\n!!`, err, '\n||', stack);
		} else if (data) {
			console.error(`ERROR: ** ${text}\n->`, data);
		} else {
			console.error(`ERROR: ** ${text}`);
		}
		if (alert) {
			this.alert(text, scope);
		}
	}
}

// Delegate from CBLogger to CBAlerter
Object.setPrototypeOf(CBLogger, CBAlerter);

module.exports = CBLogger;

