import logging
import os.path
import uuid
import json
import tornado.escape
import tornado.websocket


class ChatSocketHandler(tornado.websocket.WebSocketHandler):
    waiters = set()
    cache = []
    cache_size = 200

    def check_origin(self, origin):
        return True

    def open(self):
        ChatSocketHandler.waiters.add(self)

    def on_close(self):
        ChatSocketHandler.waiters.remove(self)

    @classmethod
    def update_cache(cls, msg):
        cls.cache.append(msg)
        if len(cls.cache) > cls.cache_size:
            cls.cache = cls.cache[-cls.cache_size:]

    @classmethod
    def send_updates(cls, msg, sender):
        logging.info("sending message to %d waiters", len(cls.waiters))
        for waiter in cls.waiters:
            if waiter==sender:
                continue
            try:
                waiter.write_message(msg)
            except:
                logging.error("Error sending message", exc_info=True)

    def on_message(self, message):
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)
        if (parsed["head"] == "G_ALL"):
            res= {
                "head": "G_ALL",
                "body": json.load(open("data.json"))
            }
            logging.info("send initial data")
            self.write_message(json.dumps(res))
        else:
            ChatSocketHandler.update_cache(parsed)
            ChatSocketHandler.send_updates(parsed, self)
        
