from tornado import gen, web, ioloop, httpserver
from tornado.options import define, options, parse_command_line
from websocket import ChatSocketHandler
import json

define("port", default=8888, help="run on the given port", type=int)
define("production", default=False, help="true if is a production server", type=bool)

try:
    parse_command_line()
except:
    pass

handlers = [
    ("/websocket", ChatSocketHandler),
]
settings = {
    "debug": not options.production,
    "compress_response": True,
}

campanita_app = web.Application(handlers, **settings)

def deploy_server(web_app):
    http_server = httpserver.HTTPServer(web_app)
    http_server.listen(options.port)
    print("Server Listening in port: %d"%options.port)
    ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    deploy_server(campanita_app)
