import logging
import os.path
import uuid
import json
from tornado import escape, websocket, ioloop, gen


class MongoHandler():
    @staticmethod
    @gen.coroutine
    def get_all(client, motor_db):
        cursor_nodos = motor_db.nodes.find({})
        cursor_cuadras = motor_db.cuadras.find({})
        nodos = []
        cuadras = []
        while(yield cursor_nodos.fetch_next):
            nodo = cursor_nodos.next_object()
            nodo["id"] = nodo["_id"]
            nodo.pop("_id")
            nodos.append(nodo)

        while(yield cursor_cuadras.fetch_next):
            cuadra = cursor_cuadras.next_object()
            cuadra["id"] = cuadra["_id"]
            cuadra.pop("_id")
            cuadras.append(cuadra)

        client.write_message( { "head": "G_ALL",
                                "body": {
                                    "nodes": nodos,
                                    "cuadras": cuadras
                                }
                            })

    @staticmethod
    @gen.coroutine
    def update_node(msg, sender, clients, motor_db):
        nodo = msg["body"]
        old = yield motor_db.nodes.find_one({"_id": nodo["id"]})
        old_tags = old.get("tags", {})
        old_tags.update(nodo.get("tags", {}))
        new_nodo = {
            "lon": nodo.get("lon", old["lon"]),
            "lat": nodo.get("lat", old["lat"]),
            "tags": old_tags,
        }
        res = yield motor_db.nodes.update({"_id": nodo["id"]}, new_nodo)
        # Le agregamos el id para mandarlo a los clientes
        new_nodo["id"] = nodo["id"]
        for client in clients:
            if client != sender:
                client.write_message({
                    "head": "U_NODE",
                    "body": new_nodo,
                })

    @staticmethod
    @gen.coroutine
    def update_cuadra(msg, sender, clients, motor_db):
        cuadra = msg["body"]
        old = yield motor_db.cuadras.find_one({"_id": cuadra["id"]})
        old_tags = old.get("tags", {})
        old_tags.update(cuadra.get("tags", {}))
        new_cuadra = {
            "nodes": cuadra.get("nodes", []),
            "tags": old_tags,
        }
        res = yield motor_db.cuadras.update({"_id": cuadra["id"]}, new_cuadra)
        # Le agregamos el id para mandarlo a los clientes
        new_cuadra["id"] = cuadra["id"]
        for client in clients:
            if client != sender:
                client.write_message({
                    "head": "U_CUAD",
                    "body": new_cuadra,
                })


class ChatSocketHandler(websocket.WebSocketHandler):
    waiters = set()
    cache = []
    cache_size = 200

    # message_dict = {
    #     "G_ALL": msg_get_data,
    #     "C_NODE",
    #     "D_NODE",
    #     "u_NODE",
    #     "C_CUAD",
    #     "D_CUAD",
    #     "u_CUAD"
    # }
    
    def msg_get_data (self, body):
        self.db.nodos.find()

    def check_origin(self, origin):
        return True

    def open(self):
        self.set_nodelay(True);
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
        parsed = escape.json_decode(message)
        if (parsed["head"] == "G_ALL"):
            ioloop.IOLoop.current().spawn_callback(
                MongoHandler.get_all, self, self.settings["db"])
            logging.info("send initial data")
        elif parsed["head"] in self.message_dict.keys():
            self.process_message(parsed)
