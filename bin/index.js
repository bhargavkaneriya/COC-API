'use strict';
const logger = require("../utils/logger-handler");
const config = require("./../config");

if (
  process.argv.length > 2 &&
  process.argv[process.argv.length - 1] === "test"
) {
  logger("some test case\n");
} else {
  /**
   * Module dependencies.
   */

  const app = require("../app");
  const debug = require("debug")("myAPP:server");
  const http = require("http");

  const normalizePort = function (val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
      return val;
    }
    if (port >= 0) {
      return port;
    }
    return false;
  };

  /**
   * Event listener for HTTP server "error" event.
   */

  const onError = function (error) {
    if (error.syscall !== "listen") {
      throw error;
    }

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger(`Port is already in use\n`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  };

  /**
   * Event listener for HTTP server "listening" event.
   */

  //Create HTTP server.
  const server = http.createServer(app);
  const onListening = function () {
    const addr = server.address();
    const bind =
      typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
  };

  //Get port from environment and store in Express.
  const port = normalizePort(config.port);
  app.set("port", port);
  logger(`::${config.appName} running on port ${port}\n`);

  server.listen(port);
  server.on("error", onError);
  server.on("listening", onListening);
}
