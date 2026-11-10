const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info", // niveau minimal : info, debug, warn, error
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new transports.Console(), // affichage dans la console
    new transports.File({ filename: "logs/error.log", level: "error" }), // log erreurs
    new transports.File({ filename: "logs/combined.log" }) // log complet
  ],
});

module.exports = logger;

