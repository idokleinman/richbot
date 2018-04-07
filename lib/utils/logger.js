const Logger = require('logplease');
const options = {
	useColors: true,     // Enable colors
	color: Logger.Colors.White, // Set the color of the logger
	showTimestamp: true, // Display timestamp in the log message
	showLevel: true,     // Display log level in the log message
	filename: 'richbot.log', // Set file path to log to a file
	appendFile: true,    // Append logfile instead of overwriting
};

const logger = Logger.create('', options);

module.exports = logger;